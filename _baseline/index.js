import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { HtmlBasePlugin } from '@11ty/eleventy';
import { eleventyImageOnRequestDuringServePlugin } from '@11ty/eleventy-img';
import markdownItAttrs from 'markdown-it-attrs';

import { createLogger, printBannerOnce } from './core/logging/index.js';
import { isLegacyShape, normalizeLegacyShape } from './core/back-compat/options.js';
import { optionsSchema, settingsSchema } from './core/schema.js';
import { deriveBaselineState } from './core/state.js';
import { runPrepass, PREPASS_SENTINEL } from './core/content-graph/index.js';
import { registerVirtualDir } from './core/virtual-dir.js';
import { createContentMapStore } from './core/content-map-store.js';
import { createTranslationMapStore, createTranslationIndexStore } from './core/translation-map-store.js';
import { createSlugIndex } from './core/slug-index.js';
import { registerSegmentation } from './core/segmentation/index.js';
import { SEGMENT_DATA_KEY, PAGEBREAK_COMPUTED_KEY } from './core/segmentation/constants.js';
import { registerPageContext } from './core/page-context/index.js';
import { registerSeoGraph } from './core/seo-graph/index.js';
import { autoHeadingIds, safeUse, wikilinks } from './core/markdown/index.js';
import { slugify } from './core/utils/slugify.js';
import { hasAnyPlugin } from './core/utils/has-plugin.js';
import { createRegistrar } from './core/utils/registrar.js';
import { resolveDefault } from './core/locale/index.js';
import { assetsCore, headCore, multilangCore, navigatorCore, sitemapCore } from './modules.js';
import {
	registerGlobals,
	markdownFilter,
	relatedPostsFilter,
	isStringFilter,
	createTFilter,
	createImageShortcode
} from './core/surface/index.js';

const __require = createRequire(import.meta.url);
const { name, version } = __require('./package.json');
const eleventyVersion = process.env.ELEVENTY_VERSION;
// const absoluteRoot = process.env.ELEVENTY_ROOT; -> Safekeeping.

// Whitelist of reserved global data keys used internally across the plugin.
// Positive side effect is they all get listed in order and merge data to the same key.
// Also prevents name collision with filters.
const INTERNAL_KEYS = [
	'_baseline',
	'_assets',
	'_head',
	'_multilang',
	'_navigator',
	'_sitemap',
	'_snapshot',
	// Written per page by the segmentation preprocessor; reserved site-wide.
	SEGMENT_DATA_KEY,
	PAGEBREAK_COMPUTED_KEY,
	'eleventyComputed._pageContext',
	'eleventyComputed._node',
	'eleventyComputed._seoGraph',
	'eleventyComputed._backlinks',
	'eleventyComputed._outgoing',
	'eleventyComputed._edges'
];

// Base logger outputs regardless of options: it runs before state exists, so
// there is nothing to gate it on. The three lines it emits at plugin init are
// gated at their call sites instead, by `announce` below.
const baseLog = createLogger(null, { verbose: true });

let contentGraph = null;

/**
 * Baseline (composition root)
 *
 * Eleventy plugin entry point. Normalises user input, builds the runtime
 * substrate (stores + page-context registry), and registers feature modules
 * in deterministic order.
 *
 * Architecture layer:
 *   composition root
 *
 * System role:
 *   The single place that wires settings + options into state, attaches
 *   lifecycle stores, registers the page-context registry, and hands a
 *   uniform module context to each module. No feature behaviour lives here.
 *
 * Lifecycle:
 *   build-time → legacy-shape detection, state computation, virtual dir
 *                registration, store and page-context registration, module
 *                wiring
 *
 * Why this exists:
 *   Modules need a stable, normalised input contract and a shared runtime
 *   surface. Centralising the wiring keeps activation rules, option
 *   inference, and registration order in one auditable place.
 *
 * Scope:
 *   Owns the legacy-shape compatibility shim, state computation, runtime
 *   store creation, page-context registration, and the module registry.
 *   Does not own any feature behaviour; modules implement that.
 *
 * Data flow:
 *   settings + options → state → runtime stores + page-context registry →
 *   modules
 *
 * Typedefs (BaselineSettings, BaselineOptions, BaselineState, BaselineContext)
 * live in core/types.js.
 *
 * @param {import('./core/types.js').BaselineSettings} [settings]
 * @param {import('./core/types.js').BaselineOptions} [options]
 */
export default function baseline(settings = {}, options = {}) {
	// Baseline no longer loads `.env` itself.
	const mode = process.env.ELEVENTY_ENV;
	// eslint-disable-next-line no-unused-vars
	const isDev = mode === 'development';
	// eslint-disable-next-line no-unused-vars
	const isProd = mode === 'production';

	// --- Legacy compatibility layer ---
	if (isLegacyShape(settings, arguments.length)) {
		const normalized = normalizeLegacyShape(settings);
		settings = normalized.settings;
		options = normalized.options;
		baseLog.warn('Single-object plugin arg is deprecated. Use baseline(settings, options).');
	}

	// Validate configuration shape (non-fatal). Modules validate their own
	// option slices; this covers the keys the composition root reads.
	const parsedSettings = settingsSchema.safeParse(settings);
	if (!parsedSettings.success) {
		for (const issue of parsedSettings.error.issues) {
			baseLog.warn('settings:', `${issue.path.join('.')}, ${issue.message}`);
		}
	}

	const parsedOptions = optionsSchema.safeParse(options);
	if (!parsedOptions.success) {
		for (const issue of parsedOptions.error.issues) {
			baseLog.warn('options:', `${issue.path.join('.')}, ${issue.message}`);
		}
	}

	// Resolve state once, above the closure. Pure; no eleventyConfig.
	const state = deriveBaselineState(settings, options, { mode });

	// Set by the initializer below, so the logging helper can read Eleventy's
	// quiet mode. It is not available in this scope until the plugin runs.
	let activeConfig = null;

	// Scoped logging helper.
	function scopedLog(name) {
		return createLogger(name, {
			verbose: state.options.verbose,
			silent: state.options.silent,
			// Read per call: --quiet arrives through _setQuietModeOverride and a
			// consumer can flip it from their own config after we register.
			quiet: () => activeConfig?.quietMode === true
		});
	}

	/**
	 * Eleventy plugin initializer.
	 *
	 * This function is executed during Eleventy configuration time and
	 * composes global APIs, filters, shortcodes, and feature modules.
	 */
	const plugin = async function (eleventyConfig) {
		activeConfig = eleventyConfig;

		// Three states, not two. Saying nothing gets the banner, the version line
		// and one module summary. `verbose: false` is an explicit request for
		// quiet and drops all three. Eleventy's own `--quiet` does the same.
		const announce = !state.options.silent && eleventyConfig.quietMode !== true;
		if (announce) printBannerOnce(baseLog, { version, eleventyVersion });

		// The pre-pass runs Eleventy inside Eleventy. The inner build renders
		// only to be parsed, so it wants path-only hrefs rather than absolute
		// ones, which is what keeps graph edges keyed the same way as page.url.
		const isPrepass = process.env[PREPASS_SENTINEL] === '1';

		// --- Eleventy compatibility check ---
		try {
			eleventyConfig.versionCheck('>=3.0');
		} catch (e) {
			baseLog.error('Eleventy version mismatch.', e.message);
		}

		INTERNAL_KEYS.forEach((key) => {
			// We leave eleventyComputed callback keys alone, the rest are reserved-empty.
			// Reserving one empty would overwrite the callback that registers it.
			if (key.startsWith('eleventyComputed.')) return;
			eleventyConfig.addGlobalData(key, {});
		});

		const env = {
			version,
			name: 'Eleventy Baseline',
			env: {
				mode,
				package: name
			}
		};

		eleventyConfig.addGlobalData('_baseline', {
			...env,
			options: state.options
		});

		// State drops a settings.url it cannot use, so the two cases arrive here
		// looking the same. Say which one it was.
		if (!state.settings.url) {
			baseLog.warn(
				settings.url
					? `settings.url is not an absolute http(s) URL ("${settings.url}"), ignoring it. Canonical, Open Graph and JSON-LD will be omitted.`
					: 'settings.url missing, canonical, Open Graph and JSON-LD will be omitted'
			);
		}

		// HtmlBasePlugin is `unique`, so Eleventy drops this registration without
		// a word when the project made one first. Fair outcome, bad silence: the
		// base decides what every relative URL becomes.
		const baseHref = isPrepass ? '/' : state.settings.url || eleventyConfig.pathPrefix;
		if (!isPrepass && hasAnyPlugin(eleventyConfig, ['@11ty/eleventy/html-base-plugin', 'eleventyHtmlBasePlugin'])) {
			baseLog.warn(
				`HtmlBasePlugin is already registered, so yours wins and Baseline's base ("${baseHref}") is not applied.`
			);
		}

		eleventyConfig.addPlugin(HtmlBasePlugin, { baseHref });

		// --- Pre-pass wiring ---
		// One mechanic: the pre-pass runs at the start of every Eleventy
		// build cycle via `eleventy.before`. Initial build, watch rebuild,
		// production build — all the same path. Templates always render
		// against a graph rebuilt from current source. The sentinel keeps
		// the inner Eleventy from re-attaching the hook on re-entry.
		if (!isPrepass) {
			eleventyConfig.on('eleventy.before', async () => {
				contentGraph = await runPrepass(
					eleventyConfig.directories?.input,
					eleventyConfig.directories?.output,
					scopedLog,
					// The graph reads pages. Stylesheets and scripts are neither, and
					// compiling them into a dryRun is the pre-pass's largest waste.
					{ quietMode: true, ignore: [eleventyConfig.directories?.assets] }
				);
			});
		}

		registerGlobals(eleventyConfig);

		// --- Feature exposure to templates ---
		// Detection matches on `Function.name`, so wrapping the plugin in an
		// arrow or a factory silently returns false, `eleventy:ignore` is
		// omitted and both pipelines process the same image. Saying what was
		// detected turns that into a line to check. Two names because the
		// export alias and the declaration differ upstream; see `hasAnyPlugin`.
		const hasImageTransformPlugin = hasAnyPlugin(eleventyConfig, [
			'eleventyImageTransformPlugin',
			'imageTransformPlugin'
		]);
		scopedLog('image').info(
			hasImageTransformPlugin
				? 'eleventyImageTransformPlugin detected, Baseline will mark its own output eleventy:ignore'
				: 'eleventyImageTransformPlugin not detected, content images are yours to transform'
		);

		eleventyConfig.addGlobalData('_baseline', {
			features: {
				...state.features,
				hasImageTransformPlugin
			}
		});

		// --- Virtual directories ---
		registerVirtualDir(eleventyConfig, {
			key: 'assets'
		});

		const publicDir = registerVirtualDir(eleventyConfig, {
			key: 'public',
			outputDir: ''
		});

		const virtualDirLog = scopedLog('virtual-dir');
		virtualDirLog.info('Virtual directories mounted');

		const directories = {
			input: eleventyConfig.directories?.input,
			output: eleventyConfig.directories?.output,
			includes: eleventyConfig.directories?.includes,
			data: eleventyConfig.directories?.data,
			assets: eleventyConfig.directories?.assets,
			public: eleventyConfig.directories?.public
		};

		eleventyConfig.addPassthroughCopy({ [publicDir.input]: '/' });

		// Add paths to global.
		eleventyConfig.addGlobalData('_baseline', {
			paths: {
				...directories
			}
		});

		// --- Draft filtering (build-time concern) ---
		// Leaving an existing `drafts` preprocessor alone is the right default,
		// and it is worth saying out loud: Baseline's keys on ELEVENTY_RUN_MODE,
		// which cannot be misconfigured, and a starter's keys on whatever it
		// likes. The guard trades a guarantee for whatever the other one does.
		if (eleventyConfig.preprocessors.drafts) {
			scopedLog('drafts').info("a 'drafts' preprocessor is already registered, Baseline's is skipped");
		} else {
			eleventyConfig.addPreprocessor('drafts', '*', (data) => {
				if (data.draft && process.env.ELEVENTY_RUN_MODE === 'build') {
					return false;
				}
			});
		}

		// --- Page segmentation (one source file, many pages) ---
		// After drafts: a dropped draft never reaches the split.
		registerSegmentation(eleventyConfig, { log: scopedLog('segmentation') });

		// --- Runtime stores (self-attach their lifecycle listeners) ---
		const contentMapStore = createContentMapStore(eleventyConfig);
		const translationMapStore = createTranslationMapStore(eleventyConfig);
		const translationIndexStore = createTranslationIndexStore(eleventyConfig);
		const slugIndex = createSlugIndex(eleventyConfig);

		// --- Module helpers (derived state) ---
		const helpers = {};

		// --- Core context (lazy access layer) ---
		const coreContext = {
			env,
			state,
			runtime: {
				get contentMap() {
					return contentMapStore.get();
				},
				get contentGraph() {
					return contentGraph;
				},
				translationMap: translationMapStore,
				translationIndex: translationIndexStore,
				slugIndex
			},
			directories,
			helpers,
			// Handed over so the core registrars log through the same gates as the
			// modules do, Eleventy's quiet mode included.
			scopedLog
		};

		// Page context and SEO graph registries
		const pageContextRegistry = registerPageContext(eleventyConfig, coreContext);
		const seoGraphRegistry = registerSeoGraph(eleventyConfig, coreContext);

		// --- Content graph ---
		// Cascade hookup for the content graph. Reads via the runtime getter so
		// serve-mode rebuilds reassigning `contentGraph` are picked up.
		function getNode(pageUrl) {
			return coreContext.runtime.contentGraph?.nodes?.[pageUrl];
		}

		function getEdges() {
			return coreContext.runtime.contentGraph?.edges ?? [];
		}

		eleventyConfig.addGlobalData('eleventyComputed._node', () => (data) => {
			const pageUrl = data.page?.url;
			if (!pageUrl) return undefined;

			return getNode(pageUrl);
		});

		eleventyConfig.addGlobalData('eleventyComputed._backlinks', () => (data) => {
			const edges = getEdges();

			const pageUrl = data.page?.url;
			if (!pageUrl) return [];

			return edges.filter((edge) => edge.to === pageUrl);
		});

		eleventyConfig.addGlobalData('eleventyComputed._outgoing', () => (data) => {
			const edges = getEdges();

			const pageUrl = data.page?.url;
			if (!pageUrl) return [];

			return edges.filter((edge) => edge.from === pageUrl);
		});

		// --- Markdown engine ---
		// Order matters: attrs first so manual ids are visible to auto-heading-ids'
		// seed pass; wikilinks last since it parses inline tokens independently.
		const mdLog = scopedLog('markdown');
		eleventyConfig.amendLibrary('md', (md) => {
			safeUse(md, 'curly_attributes', markdownItAttrs, undefined, mdLog);
			safeUse(md, 'baseline_auto_heading_ids', autoHeadingIds, { slugify }, mdLog);
			safeUse(md, 'baseline_wikilinks', wikilinks, { slugIndex, pageContextRegistry, translationMapStore }, mdLog);
		});

		// --- Snapshots ---
		coreContext.snapshots = {
			contentMap: () => contentMapStore.snapshot(),
			pageContext: () => pageContextRegistry.snapshot(),
			seoGraph: () => seoGraphRegistry.snapshot()
		};

		// --- Module registry ---
		const moduleRegistry = [
			{ when: state.features.multilang, name: 'multilang', plugin: multilangCore },
			{ when: state.features.sitemap, name: 'sitemap', plugin: sitemapCore },
			{ name: 'navigator', plugin: navigatorCore },
			{ when: state.features.head, name: 'head', plugin: headCore, consumes: { pageContext: true, seoGraph: true } },
			{ when: state.features.assets, name: 'assets', plugin: assetsCore }
		];

		const active = [];
		for (const entry of moduleRegistry) {
			const { when = true, name, plugin, consumes = {} } = entry;
			if (!when) continue;
			const moduleContext = {
				...coreContext,
				log: scopedLog(name),
				resolvePageContext: consumes.pageContext ? pageContextRegistry : null,
				resolveSeoGraph: consumes.seoGraph ? seoGraphRegistry : null
			};

			eleventyConfig.addPlugin(plugin, moduleContext);
			active.push(name);
		}

		// The one line the default tier earns: which modules are on. Activation is
		// conditional in ways people get wrong, and what you cannot see is what is
		// absent, so the set is worth more than five modules each announcing
		// themselves.
		if (announce) baseLog.info(`Modules: ${active.join(', ')}`);

		// --- Media cache ---
		// Renditions are content-addressed: the filename carries a hash of the
		// source bytes plus the encode options, so a file that exists is a file
		// that is still correct. Writing them under `.cache/` rather than into
		// the output keeps them across a `dist` wipe, and across deploys on a
		// host that persists the folder. The build then copies them in.
		//
		// Nothing here invalidates. `rm -rf .cache` is the reset, and it is also
		// the answer to the one failure this cannot see: a build interrupted
		// mid-encode leaves a truncated file that now survives.
		const mediaCacheDir = path.join('.cache', 'media');

		if (!isPrepass) {
			eleventyConfig.on('eleventy.after', () => {
				if (process.env.ELEVENTY_RUN_MODE !== 'build' || !fs.existsSync(mediaCacheDir)) return;

				const target = path.join(eleventyConfig.directories?.output ?? 'dist', 'media');
				fs.cpSync(mediaCacheDir, target, { recursive: true });
				scopedLog('image').info(`Media cache copied to ${target}`);
			});
		}

		// --- Filters and shortcodes ---
		// Registered through the registrar, which yields any name the project
		// already defined rather than overwriting it.
		const registrar = createRegistrar(eleventyConfig);

		registrar.filter('markdownify', markdownFilter);
		registrar.filter('relatedPosts', relatedPostsFilter);
		registrar.filter('isString', isStringFilter);

		// String translation, registered whether or not multilang is active: a
		// single-language site still benefits from one place for its UI strings.
		registrar.filter(
			't',
			createTFilter({
				getDefaultLanguage: () => resolveDefault(state.settings).lang,
				log: scopedLog('translate')
			})
		);

		registrar.shortcode(
			'image',
			createImageShortcode({
				log: scopedLog('image'),
				hasImageTransformPlugin,
				defaults: state.options.media.image,
				cacheDir: mediaCacheDir
			})
		);

		if (registrar.skipped.length) {
			scopedLog().status(`Already defined here, left alone: ${registrar.skipped.join(', ')}`);
		}

		// --- Dev image pipeline ---
		eleventyConfig.addPlugin(eleventyImageOnRequestDuringServePlugin);
	};

	// Set a named function identity so eleventyConfig.hasPlugin() can detect this plugin.
	Object.defineProperty(plugin, 'name', { value: name });
	return plugin;
}

/**
 * Eleventy directory configuration (external contract)
 *
 * Defines input/output structure for the build system.
 */
export const config = {
	dir: {
		input: 'src',
		output: 'dist',
		data: '_data',
		includes: '_includes',
		assets: 'assets',
		public: 'static'
	},
	htmlTemplateEngine: 'njk',
	markdownTemplateEngine: 'njk',
	templateFormats: ['html', 'njk', 'md']
};
