import 'dotenv/config';
import { createRequire } from 'node:module';

import { HtmlBasePlugin } from '@11ty/eleventy';
import { eleventyImageOnRequestDuringServePlugin } from '@11ty/eleventy-img';

import { createLogger, printBannerOnce } from './core/logging.js';
import { isLegacyShape, normalizeLegacyShape } from './core/back-compat/options.js';
import { settingsSchema } from './core/schema.js';
import { deriveBaselineState } from './core/state.js';
import { runPrepass, PREPASS_SENTINEL } from './core/content-graph/index.js';
import { registerGlobals } from './core/global-functions/index.js';
import { registerVirtualDir } from './core/virtual-dir.js';
import { createContentMapStore } from './core/content-map-store.js';
import { createTranslationMapStore } from './core/translation-map-store.js';
import { createSlugIndex } from './core/slug-index.js';
import { registerPageContext } from './core/page-context.js';
import { wikilinks } from './core/wikilinks.js';
import { assetsCore, headCore, multilangCore, navigatorCore, sitemapCore } from './modules.js';
import { markdownFilter, relatedPostsFilter, isStringFilter } from './core/filters/index.js';
import { imageShortcode } from './core/shortcodes/index.js';

const __require = createRequire(import.meta.url);
const { name, version } = __require('./package.json');

const mode = process.env.ELEVENTY_ENV;
// eslint-disable-next-line no-unused-vars
const isDev = mode === 'development';
// eslint-disable-next-line no-unused-vars
const isProd = mode === 'production';

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
	'eleventyComputed._pageContext',
	'eleventyComputed._node',
	'eleventyComputed._edges',
	'eleventyComputed._backlinks',
	'eleventyComputed._outgoing'
];

// Base logger outputs regardless of options.
const baseLog = createLogger(null, { verbose: true });

printBannerOnce(baseLog, version);

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
	// --- Legacy compatibility layer ---
	if (isLegacyShape(settings, arguments.length)) {
		const normalized = normalizeLegacyShape(settings);
		settings = normalized.settings;
		options = normalized.options;
		baseLog.info('DEPRECATED: single-object plugin arg. Use baseline(settings, options) instead.');
	}

	// Validate configuration shape (non-fatal).
	const parsed = settingsSchema.safeParse(settings);
	if (!parsed.success) {
		for (const issue of parsed.error.issues) {
			baseLog.info('settings:', `${issue.path.join('.')} — ${issue.message}`);
		}
	}

	// Resolve state once, above the closure. Pure; no eleventyConfig.
	const state = deriveBaselineState(settings, options, { mode });

	// Scoped logging.
	function scopedLog(name) {
		return createLogger(name, { verbose: state.options.verbose });
	}

	/**
	 * Eleventy plugin initializer.
	 *
	 * This function is executed during Eleventy configuration time and
	 * composes global APIs, filters, shortcodes, and feature modules.
	 */
	const plugin = async function (eleventyConfig) {
		// --- Eleventy compatibility check ---
		try {
			eleventyConfig.versionCheck('>=3.0');
		} catch (e) {
			baseLog.error('Eleventy version mismatch:', e.message);
		}

		// --- Pre-pass wiring ---
		// One mechanic: the pre-pass runs at the start of every Eleventy
		// build cycle via `eleventy.before`. Initial build, watch rebuild,
		// production build — all the same path. Templates always render
		// against a graph rebuilt from current source. The sentinel keeps
		// the inner Eleventy from re-attaching the hook on re-entry.
		if (process.env[PREPASS_SENTINEL] !== '1') {
			const prepassLog = scopedLog('content-graph');

			// Origins HtmlBasePlugin may have rewritten internal hrefs to.
			// Stripped during link extraction so backlinks key on path-only.
			const knownOrigins = new Set(['http://localhost:8080']);
			for (const candidate of [settings.url, process.env.URL]) {
				if (!candidate) continue;
				try {
					knownOrigins.add(new URL(candidate).origin);
				} catch {
					prepassLog('No known origins found');
				}
			}

			eleventyConfig.on('eleventy.before', async () => {
				contentGraph = await runPrepass(
					eleventyConfig.directories?.input,
					eleventyConfig.directories?.output,
					prepassLog,
					{ quietMode: true, knownOrigins }
				);
			});
		}

		INTERNAL_KEYS.forEach((key) => {
			// We leave eleventyComputed callback kEys alone, the rest are reserved-empty.
			if (
				key === 'eleventyComputed._pageContext' ||
				key === 'eleventyComputed._node' ||
				key === 'eleventyComputed._edges' ||
				key === 'eleventyComputed._backlinks' ||
				key === 'eleventyComputed._outgoing'
			)
				return;
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

		if (!settings.url) {
			baseLog.warn('settings.url missing — canonical URLs will be relative');
		}

		registerGlobals(eleventyConfig);

		eleventyConfig.addPlugin(HtmlBasePlugin, {
			baseHref: process.env.URL || eleventyConfig.pathPrefix
		});

		// --- Feature exposure to templates ---
		const hasImageTransformPlugin = eleventyConfig.hasPlugin('eleventyImageTransformPlugin');

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
		if (!eleventyConfig.preprocessors.drafts) {
			eleventyConfig.addPreprocessor('drafts', '*', (data) => {
				if (data.draft && process.env.ELEVENTY_RUN_MODE === 'build') {
					return false;
				}
			});
		}

		// --- Runtime stores (self-attach their lifecycle listeners) ---
		const contentMapStore = createContentMapStore(eleventyConfig);
		const translationMapStore = createTranslationMapStore(eleventyConfig);
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
				slugIndex
			},
			directories,
			helpers
		};

		// Page context registry
		const pageContextRegistry = registerPageContext(eleventyConfig, coreContext);

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

		// --- Content helper ---
		// Wikilinks: [[slug]] / [[slug | lang]] in body markdown.
		eleventyConfig.amendLibrary('md', (md) => {
			md.use(wikilinks, { slugIndex, pageContextRegistry, translationMapStore });
		});

		// --- Snapshots ---
		coreContext.snapshots = {
			contentMap: () => contentMapStore.snapshot(),
			pageContext: () => pageContextRegistry.snapshot()
		};

		// --- Module registry ---
		const moduleRegistry = [
			{ when: state.features.multilang, name: 'multilang', plugin: multilangCore },
			{ when: state.features.sitemap, name: 'sitemap', plugin: sitemapCore },
			{ name: 'navigator', plugin: navigatorCore },
			{ when: state.features.head, name: 'head', plugin: headCore, consumes: { pageContext: true } },
			{ when: state.features.assets, name: 'assets', plugin: assetsCore }
		];

		for (const entry of moduleRegistry) {
			const { when = true, name, plugin, consumes = {} } = entry;
			if (!when) continue;
			const moduleContext = {
				...coreContext,
				log: scopedLog(name),
				resolvePageContext: consumes.pageContext ? pageContextRegistry : null
			};

			eleventyConfig.addPlugin(plugin, moduleContext);
		}

		// --- Filters ---
		eleventyConfig.addFilter('markdownify', markdownFilter);
		eleventyConfig.addFilter('relatedPosts', relatedPostsFilter);
		eleventyConfig.addFilter('isString', isStringFilter);

		// --- Shortcodes ---
		eleventyConfig.addShortcode('image', imageShortcode);

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
