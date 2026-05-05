import 'dotenv/config';
import { createRequire } from 'node:module';

import { HtmlBasePlugin } from '@11ty/eleventy';
import { eleventyImageOnRequestDuringServePlugin } from '@11ty/eleventy-img';

import { createLogger } from './core/logging.js';
import { createContentMapStore } from './core/content-map-store.js';
import { createTranslationMapStore } from './core/translation-map-store.js';
import { createSlugIndex } from './core/slug-index.js';
import { registerVirtualDir } from './core/virtual-dir.js';
import { registerPageContext } from './core/page-context.js';
import { wikilinks } from './core/wikilinks.js';
import { settingsSchema } from './core/schema.js';

import { registerGlobals } from './core/global-functions/index.js';
import { markdownFilter, relatedPostsFilter, isStringFilter } from './core/filters/index.js';
import { imageShortcode } from './core/shortcodes/index.js';
import { assetsCore, headCore, multilangCore, navigatorCore, sitemapCore } from './modules.js';

const __require = createRequire(import.meta.url);
const { name, version } = __require('./package.json');

const mode = process.env.ELEVENTY_ENV;
const isDev = mode === 'development';
const isProd = mode === 'production';

// Options shape before refactor.
const LEGACY_OPTION_KEYS = [
	'verbose',
	'enableNavigatorTemplate',
	'enableSitemapTemplate',
	'assetsESBuild',
	'multilingual'
];

const GLOBAL_KEY = Symbol.for('eleventy:baseline:banner');

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
	'eleventyComputed._contentGraph'
];

// Base logger outputs regardless of options.
const baseLog = createLogger(null, { verbose: true });

function baselineBanner(version) {
	const label = `Eleventy Baseline v${version}`;
	const width = 42;
	const padded = label.padEnd(width - 6);

	return ['', '╔' + '═'.repeat(width - 2) + '╗', `║  ${padded}  ║`, '╚' + '═'.repeat(width - 2) + '╝', ''].join('\n');
}

function printBannerOnce(baseLog, version) {
	if (globalThis[GLOBAL_KEY]) return;

	globalThis[GLOBAL_KEY] = true;
	baseLog.print(baselineBanner(version));
}

printBannerOnce(baseLog, version);

/**
 * Detect legacy single-object plugin invocation.
 *
 * The original plugin API accepted a single merged configuration object.
 * This helper detects that shape and enables safe normalization into
 * the current (settings, options) contract.
 *
 * NOTE: arguments.length is required because default parameters mask arity.
 */
function looksLikeLegacyOptions(firstArg, argsLength) {
	if (argsLength >= 2) return false;
	if (!firstArg || typeof firstArg !== 'object') return false;
	return LEGACY_OPTION_KEYS.some((key) => key in firstArg);
}

/**
 * Normalize legacy plugin input into the current structured contract.
 *
 * - settings → site identity (content + SEO concerns)
 * - options  → runtime behavior flags
 */
function splitLegacyOptions(legacy) {
	const { defaultLanguage, languages, ...rest } = legacy;
	return {
		settings: { defaultLanguage, languages },
		options: rest
	};
}

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
	const argsLength = arguments.length;
	const wasLegacy = looksLikeLegacyOptions(settings, argsLength);

	if (wasLegacy) {
		const split = splitLegacyOptions(settings);
		settings = split.settings;
		options = split.options;
	}

	if (wasLegacy) {
		baseLog.info('DEPRECATED: single-object plugin arg. Use baseline(settings, options) instead.');
	}

	// Validate configuration shape (non-fatal).
	const parsed = settingsSchema.safeParse(settings);
	if (!parsed.success) {
		for (const issue of parsed.error.issues) {
			baseLog.info('settings:', `${issue.path.join('.')} — ${issue.message}`);
		}
	}

	// Scoped logging.
	function scopedLog(name) {
		return createLogger(name, { verbose: options.verbose });
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

		INTERNAL_KEYS.forEach((key) => {
			eleventyConfig.addGlobalData(key, {});
		});

		const env = {
			name: 'Eleventy Baseline',
			package: name,
			version,
			mode
		};

		eleventyConfig.addGlobalData('_baseline', {
			env
		});

		if (!settings.url) {
			baseLog.warn('settings.url missing — canonical URLs will be relative');
		}

		registerGlobals(eleventyConfig);

		eleventyConfig.addPlugin(HtmlBasePlugin, {
			baseHref: process.env.URL || eleventyConfig.pathPrefix
		});

		// --- State layer (authoritative configuration) ---
		const hasImageTransformPlugin = eleventyConfig.hasPlugin('eleventyImageTransformPlugin');

		const state = {
			settings: {
				title: settings.title,
				tagline: settings.tagline,
				url: settings.url,
				noindex: settings.noindex ?? false,
				defaultLanguage: settings.defaultLanguage,
				languages: settings.languages,
				head: settings.head
			},

			options: {
				verbose: options.verbose ?? false,
				multilang: options.multilingual ?? false,
				sitemap: options.sitemap ?? options.enableSitemapTemplate ?? true,
				navigator: options.navigator ?? options.enableNavigatorTemplate ?? isDev,
				head: {
					titleSeparator: options.head?.titleSeparator,
					showGenerator: options.head?.showGenerator
				},
				assets: {
					esbuild: options.assets?.esbuild ?? options.assetsESBuild ?? {}
				}
			}
		};

		eleventyConfig.addGlobalData('_baseline', {
			features: {
				...state.options,
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
				translationMap: translationMapStore,
				slugIndex
			},
			directories,
			helpers
		};

		// Page context registry
		const pageContextRegistry = registerPageContext(eleventyConfig, coreContext);

		// Wikilinks: [[slug]] / [[slug | lang]] in body markdown.
		eleventyConfig.amendLibrary('md', (md) => {
			md.use(wikilinks, { slugIndex, pageContextRegistry, translationMapStore });
		});

		coreContext.snapshots = {
			contentMap: () => contentMapStore.snapshot(),
			pageContext: () => pageContextRegistry.snapshot()
		};

		// --- Module activation ---
		const features = {
			multilang: Boolean(state.options.multilang),
			sitemap: Boolean(state.options.sitemap),
			navigator: Boolean(state.options.navigator),
			head: true,
			assets: true
		};

		// --- Module registry ---
		const moduleRegistry = [
			{ when: features.multilang, name: 'multilang', plugin: multilangCore },
			{ when: features.sitemap, name: 'sitemap', plugin: sitemapCore },
			{ name: 'navigator', plugin: navigatorCore },
			{ when: features.head, name: 'head', plugin: headCore, consumes: { pageContext: true } },
			{ when: features.assets, name: 'assets', plugin: assetsCore }
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
