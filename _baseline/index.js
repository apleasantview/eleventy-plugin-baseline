import 'dotenv/config';
import { createRequire } from 'node:module';
import { eleventyImageOnRequestDuringServePlugin } from '@11ty/eleventy-img';

import { createLogger } from './core/logging.js';
import { createContentMapStore } from './core/store.js';
import { registerVirtualDir } from './core/virtual-dir.js';
import { registerPageContext } from './core/page-context.js';
import { settingsSchema } from './core/schema.js';

import globals from './core/globals/index.js';
import filters from './core/filters/index.js';
import shortcodes from './core/shortcodes/index.js';
import modules from './core/plugins.js';

const __require = createRequire(import.meta.url);
const { name, version } = __require('./package.json');

const isDev = process.env.ELEVENTY_ENV === 'development';

const LEGACY_OPTION_KEYS = [
	'verbose',
	'enableNavigatorTemplate',
	'enableSitemapTemplate',
	'assetsESBuild',
	'multilingual'
];

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
 * Eleventy Plugin: baseline
 *
 * This plugin establishes a structured runtime layer on top of Eleventy.
 *
 * Architecture
 * --------------------------------------------------
 *
 * The system is organized into three layers:
 *
 * 1. state
 *    → normalized user configuration (settings + options)
 *
 * 2. runtime
 *    → lazy access layer over Eleventy lifecycle state
 *      (contentMap, environment bindings, derived values)
 *
 * 3. modules
 *    → feature plugins registered via a declarative registry
 *
 * This structure enforces a strict boundary between:
 * - configuration (user input)
 * - runtime state (Eleventy lifecycle)
 * - feature implementation (modules)
 *
 * and prevents implicit coupling across those domains.
 *
 * ------------------------------------------------------------
 *
 * @typedef {Object} BaselineSettings
 * Site identity and SEO configuration.
 *
 * @property {string} [title]
 * @property {string} [tagline]
 * @property {string} [url]
 * @property {boolean} [noindex]
 * @property {string} [defaultLanguage]
 * @property {Record<string, unknown>} [languages]
 * @property {Object} [head]
 *
 * @typedef {Object} BaselineOptions
 * Runtime feature flags and behavior configuration.
 *
 * @property {boolean} [verbose]
 * Enables structured debug logging across modules.
 *
 * @property {boolean|Object} [navigator]
 * Controls navigator tooling.
 * If not explicitly set, it may be inferred from environment (e.g. dev mode).
 *
 * @property {boolean} [enableSitemapTemplate]
 * Enables sitemap generation module (default: true).
 *
 * @property {boolean} [multilingual]
 * Forces multilingual mode. If omitted, it is inferred from settings.
 *
 * @property {Object} [assetsESBuild]
 * ESBuild pipeline configuration for assets system.
 *
 * ------------------------------------------------------------
 *
 * @typedef {Object} BaselineState
 * Fully resolved internal plugin state.
 *
 * @property {Object} settings
 * @property {Object} options
 *
 * ------------------------------------------------------------
 *
 * @typedef {Object} BaselineContext
 * Shared module boundary contract.
 *
 * This context is the only supported interface between:
 * - Eleventy configuration runtime
 * - baseline core
 * - feature modules
 *
 * @property {BaselineState} state
 * @property {Object} runtime
 * @property {Object} runtime.contentMap
 * @property {Object} runtime.site
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

	// Logger is initialized after normalization to ensure correct verbosity.
	const baseLog = createLogger(null, { verbose: options.verbose });

	function scopedLog(name) {
		return {
			info: (...args) => baseLog.info(`[${name}]`, ...args),
			warn: (...args) => baseLog.warn(`[${name}]`, ...args),
			error: (...args) => baseLog.error(`[${name}]`, ...args)
		};
	}

	// Content map is populated asynchronously via Eleventy lifecycle events.
	const contentMapStore = createContentMapStore();

	function resolveContentMap() {
		return contentMapStore.get();
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

		if (!settings.url) {
			baseLog.warn('settings.url missing — canonical URLs will be relative');
		}

		// BaseHref is a build-time routing concern, not site identity.
		function resolveBaseHref(eleventyConfig) {
			return process.env.URL || eleventyConfig.pathPrefix;
		}

		eleventyConfig.addPlugin(modules.EleventyHtmlBasePlugin, {
			baseHref: resolveBaseHref(eleventyConfig)
		});

		globals(eleventyConfig);

		// --- State layer (authoritative configuration) ---
		const hasImageTransformPlugin = eleventyConfig.hasPlugin('eleventyImageTransformPlugin');

		const inferredMultilingual = Boolean(settings.defaultLanguage && settings.languages);
		const inferredHead = options.head?.driver || 'default';
		const inferredSitemap = options.sitemap ?? options.enableSitemapTemplate ?? true;
		const inferredNavigator = Boolean(isDev || options.navigator || options.enableNavigatorTemplate);

		const state = {
			settings: {
				title: settings.title,
				tagline: settings.tagline,
				url: settings.url,
				noindex: settings.noindex ?? false,
				defaultLanguage: settings.defaultLanguage,
				languages: settings.languages
			},

			options: {
				verbose: options.verbose ?? false,
				multilingual: options.multilingual ?? inferredMultilingual,
				head: {
					driver: options.head?.driver ?? inferredHead
				},
				sitemap: inferredSitemap,
				navigator: {
					template: options.navigator ?? inferredNavigator
				},
				assets: {
					esbuild: options.assetsESBuild ?? {}
				}
			}
		};

		// --- Site helpers (derived state) ---
		const site = {
			get baseHref() {
				return resolveBaseHref(eleventyConfig);
			},
			get canonicalUrl() {
				return state.settings.url ?? null;
			},
			get pathPrefix() {
				return eleventyConfig.pathPrefix;
			}
		};

		// --- Virtual directories ---
		registerVirtualDir(eleventyConfig, {
			name: 'assets',
			globalDataKey: '_baseline.assets'
		});

		const publicDir = registerVirtualDir(eleventyConfig, {
			name: 'public',
			globalDataKey: '_baseline.public',
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

		// --- Global surface (minimal computed output) ---
		eleventyConfig.addGlobalData('_baseline', {
			version,
			name,
			features: {
				hasImageTransformPlugin
			},
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

		// --- Eleventy runtime bridge ---
		eleventyConfig.on('eleventy.contentMap', (data) => {
			contentMapStore.set(data);
		});

		// --- Core context (lazy access layer) ---
		const coreContext = {
			state,
			runtime: {
				get contentMap() {
					return resolveContentMap();
				}
			},
			site,
			directories
		};

		// Page context factory
		const getPageContext = registerPageContext(eleventyConfig, coreContext);

		// --- Module registry ---
		const features = {
			multilang: inferredMultilingual,
			sitemap: inferredSitemap,
			navigator: inferredNavigator
		};

		const moduleRegistry = [
			{ when: features.multilang, name: 'multilang-core', plugin: modules.multilangCore },
			{ name: 'assets-core', plugin: modules.assetsCore },
			{ name: 'head-core', plugin: modules.headCore, consumes: { pageContext: true } },
			{ when: features.sitemap, name: 'sitemap-core', plugin: modules.sitemapCore },
			{
				when: features.navigator,
				name: 'navigator-core',
				plugin: modules.navigatorCore,
				consumes: { pageContext: true }
			}
		];

		for (const entry of moduleRegistry) {
			const { when = true, name, plugin, consumes = {} } = entry;
			if (!when) continue;
			const moduleContext = {
				...coreContext,
				log: scopedLog(name),
				resolvePageContext: consumes.pageContext ? getPageContext : null
			};

			eleventyConfig.addPlugin(plugin, moduleContext);
		}

		// --- Filters ---
		eleventyConfig.addFilter('markdownify', filters.markdownFilter);
		eleventyConfig.addFilter('relatedPosts', filters.relatedPostsFilter);
		eleventyConfig.addFilter('isString', filters.isStringFilter);

		// --- Shortcodes ---
		eleventyConfig.addShortcode('image', shortcodes.imageShortcode);

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
