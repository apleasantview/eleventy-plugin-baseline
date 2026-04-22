import 'dotenv/config';
import { createRequire } from 'node:module';
import { eleventyImageOnRequestDuringServePlugin } from '@11ty/eleventy-img';

import { createContentMapStore } from './core/store.js';
import { createLogger } from './core/logging.js';
import { registerVirtualDir } from './core/virtual-dir.js';
import { settingsSchema } from './core/schema.js';

import globals from './core/globals/index.js';
import filters from './core/filters/index.js';
import shortcodes from './core/shortcodes/index.js';
import modules from './core/plugins.js';
import { log } from 'node:console';

const __require = createRequire(import.meta.url);
const { name, version } = __require('./package.json');

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
 * Before the current (settings, options) API, callers passed a merged object.
 * This shim detects that shape and splits it safely.
 *
 * NOTE: arguments.length is required because default parameters mask arity.
 */
function looksLikeLegacyOptions(firstArg, argsLength) {
	if (argsLength >= 2) return false;
	if (!firstArg || typeof firstArg !== 'object') return false;
	return LEGACY_OPTION_KEYS.some((key) => key in firstArg);
}

/**
 * Normalize legacy plugin input into structured shape:
 * - settings: site identity (content semantics)
 * - options: plugin behavior flags (runtime behavior)
 */
function splitLegacyOptions(legacy) {
	const { defaultLanguage, languages, ...rest } = legacy;
	return {
		settings: { defaultLanguage, languages },
		options: rest
	};
}

/**
 * Eleventy Plugin Baseline.
 *
 * Architecture overview:
 *
 * This plugin is structured into three distinct layers:
 *
 * 1. seeds
 *    → Pure user-provided input (settings + options merged + normalized)
 *
 * 2. state (formerly "config")
 *    → Fully resolved internal representation used by modules
 *
 * 3. runtime
 *    → Live Eleventy/environment bindings (contentMap, baseHref, etc.)
 *
 * This separation prevents coupling between:
 * - Eleventy runtime state
 * - user configuration
 * - derived plugin behavior
 *
 * ------------------------------------------------------------
 *
 * @typedef {Object} BaselineSettings
 * @property {string} [title] Site title.
 * @property {string} [tagline] Site tagline.
 * @property {string} [url] Canonical site URL.
 * @property {boolean} [noindex] Opt out of indexing.
 * @property {string} [defaultLanguage] IETF/BCP47 language code.
 * @property {Record<string, unknown>} [languages] Language map.
 * @property {Object} [head] Global head seeds (meta/link/script).
 *
 * @typedef {Object} BaselineOptions
 * @property {boolean} [verbose=false] Enable debug logging.
 * @property {boolean} [enableNavigatorTemplate=false] Enable navigator tooling.
 * @property {boolean} [enableSitemapTemplate=true] Enable sitemap generation.
 * @property {boolean} [multilingual] Force multilingual mode (otherwise inferred).
 * @property {Object} [assetsESBuild] ESBuild pipeline options.
 *
 * ------------------------------------------------------------
 *
 * @typedef {Object} BaselineState
 * Fully resolved internal plugin state.
 * This replaces the ambiguous "config" naming.
 *
 * @property {Object} settings Normalized site settings (title, url, languages, etc.)
 * @property {Object} options Normalized runtime options (verbose, flags, assets, etc.)
 *
 * ------------------------------------------------------------
 *
 * @typedef {Object} BaselineContext
 * Shared dependency boundary passed into modules.
 *
 * @property {BaselineState} state
 *
 * @property {Object} runtime
 *
 * @property {Object} runtime.contentMap
 * @property {Function} runtime.contentMap.get
 * Returns Eleventy contentMap snapshot (throws if not ready).
 *
 * @property {Object} runtime.site
 * @property {Function} runtime.site.canonicalUrl
 * Canonical URL derived from settings.url (nullable).
 * @property {Function} runtime.site.baseHref
 * Base href derived from environment (URL → pathPrefix fallback).
 *
 * ------------------------------------------------------------
 *
 * @param {BaselineSettings} [settings={}] Site identity + SEO configuration.
 * @param {BaselineOptions} [options={}] Plugin behavior flags.
 *
 * @returns {(eleventyConfig: import("@11ty/eleventy").UserConfig) => Promise<void>}
 * Eleventy plugin initializer.
 */
export default function baseline(settings = {}, options = {}) {
	// --- Legacy compatibility layer ---
	// Supports pre-refactor single-object plugin signature.
	const argsLength = arguments.length;
	const wasLegacy = looksLikeLegacyOptions(settings, argsLength);

	if (wasLegacy) {
		const split = splitLegacyOptions(settings);
		settings = split.settings;
		options = split.options;
	}

	// Logger initialized after options normalization so verbosity is correct.
	const baseLog = createLogger(null, { verbose: options.verbose });

	function scopedLog(name) {
		return {
			info: (...args) => baseLog.info(`[${name}]`, ...args),
			warn: (...args) => baseLog.warn(`[${name}]`, ...args),
			error: (...args) => baseLog.error(`[${name}]`, ...args)
		};
	}

	// Shared content map store (populated post-Eleventy initialization event)
	const contentMapStore = createContentMapStore();

	function resolveContentMap() {
		const map = contentMapStore.get();
		// if (!map) {
		// 	throw new Error('[eleventy-plugin-baseline] contentMap not ready — ensure Eleventy contentMap event has fired');
		// }
		return map;
	}

	if (wasLegacy) {
		baseLog.info('DEPRECATED: single-object plugin arg. Use baseline(settings, options) instead.');
	}

	// Validate only structural correctness of settings (non-fatal)
	const parsed = settingsSchema.safeParse(settings);
	if (!parsed.success) {
		for (const issue of parsed.error.issues) {
			baseLog.info('settings:', `${issue.path.join('.')} — ${issue.message}`);
		}
	}

	/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
	const plugin = async function (eleventyConfig) {
		// --- Eleventy compatibility check ---
		try {
			eleventyConfig.versionCheck('>=3.0');
		} catch (e) {
			baseLog.error('Eleventy version mismatch:', e.message);
		}

		// Early warning for missing canonical domain configuration
		if (!settings.url) {
			baseLog.warn('settings.url missing — canonical URLs will be relative');
		}

		// --- BaseHref resolution (build-time routing concern) ---
		// This is NOT site identity. It is output path correction logic.
		function resolveBaseHref(eleventyConfig) {
			return process.env.URL || eleventyConfig.pathPrefix;
		}

		eleventyConfig.addPlugin(modules.EleventyHtmlBasePlugin, {
			baseHref: resolveBaseHref(eleventyConfig)
		});

		globals(eleventyConfig);

		// --- Config layer (authoritative input state) ---
		// This is the single source of truth for:
		// - site identity (settings)
		// - plugin behavior (options)
		const hasImageTransformPlugin = eleventyConfig.hasPlugin('eleventyImageTransformPlugin');
		const inferredMultilingual = Boolean(settings.defaultLanguage && settings.languages);

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
				enableNavigatorTemplate: options.enableNavigatorTemplate ?? false,
				enableSitemapTemplate: options.enableSitemapTemplate ?? true,
				multilingual: options.multilingual ?? inferredMultilingual,
				assets: {
					esbuild: options.assetsESBuild ?? {}
				}
			}
		};

		const site = {
			// Build-time output base (path resolution, not identity) derived from runtime environment.
			get baseHref() {
				return resolveBaseHref(eleventyConfig);
			},
			// Canonical identity (SEO / metadata) derived from state.
			get canonicalUrl() {
				return state.settings.url ?? null;
			},
			get pathPrefix() {
				return eleventyConfig.pathPrefix;
			}
		};

		// --- Virtual filesystem mapping ---
		// Must be registered early so downstream modules can rely on it synchronously.
		// Also registers `_baseline.*` as global data for template use
		const assets = registerVirtualDir(eleventyConfig, {
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

			// virtual dirs (your system)
			assets: eleventyConfig.directories?.assets,
			public: eleventyConfig.directories?.public
		};

		eleventyConfig.addPassthroughCopy({ [publicDir.input]: '/' });

		// --- Global surface (minimal computed data for templates) ---
		// This is intentionally small and does NOT duplicate config or runtime.
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
		// Prevents drafts from entering production builds and
		// guards against double-registration; user config wins if already set.
		if (!eleventyConfig.preprocessors.drafts) {
			eleventyConfig.addPreprocessor('drafts', '*', (data) => {
				if (data.draft && process.env.ELEVENTY_RUN_MODE === 'build') {
					return false;
				}
			});
		}

		// --- Content map runtime bridge ---
		// Eleventy emits this event after collection resolution.
		// We cache it so runtime modules can resolve URLs from input paths.
		eleventyConfig.on('eleventy.contentMap', (data) => {
			contentMapStore.set(data);
		});

		// --- Runtime context (lazy access layer) ---
		// This is the ONLY layer allowed to:
		// - touch Eleventy runtime state
		// - expose derived values
		// - resolve config into behavior
		const runtimeContext = {
			state,
			runtime: {
				get contentMap() {
					return resolveContentMap();
				}
			},
			site,
			directories
		};

		// --- Module registration (ordered by dependency graph) ---
		const features = {
			multilang: inferredMultilingual,
			sitemap: state.options.enableSitemapTemplate
		};

		const moduleRegistry = [
			{ when: features.multilang, name: 'multilang-core', plugin: modules.multilangCore },
			{ name: 'assets-core', plugin: modules.assetsCore },
			{ name: 'head-core', plugin: modules.headCore },
			{ when: features.sitemap, name: 'sitemap-core', plugin: modules.sitemapCore }
		];

		for (const { when = true, name, plugin } of moduleRegistry) {
			if (!when) continue;

			const moduleContext = {
				...runtimeContext,
				log: scopedLog(name)
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

		// --- Debug tooling (non-public API surface) ---
		const debugContext = {
			...runtimeContext,
			log: scopedLog('navigator-core')
		};
		eleventyConfig.addPlugin(modules.navigatorCore, debugContext);
	};

	// Set a named function identity so eleventyConfig.hasPlugin() can detect this plugin.
	Object.defineProperty(plugin, 'name', { value: name });
	return plugin;
}

// --- Eleventy directory configuration (external contract) ---
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
