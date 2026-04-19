import 'dotenv/config';
import globals from './core/globals.js';
import debug from './core/debug.js';
import filters from './core/filters.js';
import modules from './core/modules.js';
import shortcodes from './core/shortcodes.js';
import { settingsSchema } from './core/schema.js';
import { eleventyImageOnRequestDuringServePlugin } from '@11ty/eleventy-img';

import { createRequire } from 'node:module';
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
 * Detect the pre-settings-convention single-arg call shape.
 * Returns true when the caller passed one object that blends settings + options.
 * Caller must pass `argsLength` (arguments.length from the outer function) so
 * default parameter values don't mask a missing second argument.
 */
function looksLikeLegacyOptions(firstArg, argsLength) {
	if (argsLength >= 2) return false;
	if (!firstArg || typeof firstArg !== 'object') return false;
	return LEGACY_OPTION_KEYS.some((key) => key in firstArg);
}

/**
 * Split a legacy single-object argument into the new (settings, options) pair.
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
 * @typedef {Object} BaselineSettings
 * @property {string} [title] Site title.
 * @property {string} [tagline] Site tagline.
 * @property {string} [url] Site URL.
 * @property {boolean} [noindex] Opt the whole site out of indexing.
 * @property {string} [defaultLanguage] IETF/BCP47 default language code.
 * @property {Record<string, unknown>} [languages] Language definition map.
 * @property {Object} [head] Head additions (link/script arrays).
 *
 * @typedef {Object} BaselineOptions
 * @property {boolean} [verbose=false] Enable extra logging from the plugin.
 * @property {boolean} [enableNavigatorTemplate=false] Register navigator template/routes.
 * @property {boolean} [enableSitemapTemplate=true] Register sitemap template/routes.
 * @property {boolean} [multilingual] Enable multilang core. Inferred from settings.defaultLanguage + settings.languages when omitted.
 * @property {Object} [assetsESBuild] Options forwarded to assets-esbuild (minify/target).
 *
 * @param {BaselineSettings} [settings={}] Site identity data (title, url, languages, head).
 * @param {BaselineOptions} [options={}] Plugin behaviour flags.
 * @returns {(eleventyConfig: import("@11ty/eleventy").UserConfig) => Promise<void>}
 */
export default function baseline(settings = {}, options = {}) {
	// --- Legacy shim ---
	// Pre-settings-convention callers passed a single blended object.
	// Detect that shape and split it, so the new signature is backwards-compatible.
	// Use arguments.length because default params mask undefined second args.
	const argsLength = arguments.length;
	if (looksLikeLegacyOptions(settings, argsLength)) {
		const split = splitLegacyOptions(settings);
		if (split.options.verbose) {
			console.warn(
				'[eleventy-plugin-baseline] DEPRECATED: single-object plugin arg. Use baseline(settings, options) instead.'
			);
		}
		settings = split.settings;
		options = split.options;
	}

	// --- Settings validation ---
	// Structural-only; invalid settings log a warning but do not throw.
	const parsed = settingsSchema.safeParse(settings);
	if (!parsed.success && options.verbose) {
		for (const issue of parsed.error.issues) {
			console.warn(`[eleventy-plugin-baseline] settings: ${issue.path.join('.')} — ${issue.message}`);
		}
	}

	/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
	const plugin = async function (eleventyConfig) {
		try {
			eleventyConfig.versionCheck('>=3.0');
		} catch (e) {
			console.log(`[eleventy-plugin-baseline] WARN Eleventy plugin compatibility: ${e.message}`);
		}

		// --- Options ---
		// Merge user options with defaults, detect environment capabilities.
		// The _baseline global below is a curated subset — not the full options object.
		const hasImageTransformPlugin = eleventyConfig.hasPlugin('eleventyImageTransformPlugin');

		const inferredMultilingual = Boolean(settings.defaultLanguage && settings.languages);
		const userOptions = {
			verbose: options.verbose ?? false,
			enableNavigatorTemplate: options.enableNavigatorTemplate ?? false,
			enableSitemapTemplate: options.enableSitemapTemplate ?? true,
			multilingual: options.multilingual ?? inferredMultilingual,
			defaultLanguage: settings.defaultLanguage,
			languages: settings.languages,
			assets: {
				esbuild: options.assetsESBuild ?? {}
			}
		};

		// --- Global data ---
		// Curated public surface — only what templates and shortcodes need.
		// `verbose` and `hasImageTransformPlugin` stay until getVerbose rework
		// and image shortcode refactor remove the need to read them from global data.
		eleventyConfig.addGlobalData('_baseline', {
			version,
			name,
			verbose: userOptions.verbose,
			hasImageTransformPlugin
		});

		globals(eleventyConfig);
		eleventyConfig.addPassthroughCopy({ './src/static': '/' });

		// Drafts preprocessor — skip draft pages during production builds.
		// Guarded against double-registration; user config wins if already set.
		if (!eleventyConfig.preprocessors.drafts) {
			eleventyConfig.addPreprocessor('drafts', '*', (data) => {
				if (data.draft && process.env.ELEVENTY_RUN_MODE === 'build') {
					return false;
				}
			});
		}

		// --- Modules ---
		// Registration order matters: multilang first (sets up locale data),
		// then assets, head, sitemap. Navigator is last (debug only).
		if (userOptions.multilingual) {
			eleventyConfig.addPlugin(modules.multilangCore, {
				...userOptions
			});
		}

		eleventyConfig.addPlugin(modules.EleventyHtmlBasePlugin, {
			baseHref: process.env.URL || eleventyConfig.pathPrefix
		});
		eleventyConfig.addPlugin(modules.assetsCore, { esbuild: userOptions.assets.esbuild });

		eleventyConfig.addPlugin(modules.headCore);
		eleventyConfig.addPlugin(modules.sitemapCore, {
			...userOptions
		});

		// --- Filters ---
		eleventyConfig.addFilter('markdownify', filters.markdownFilter);
		eleventyConfig.addFilter('relatedPosts', filters.relatedPostsFilter);
		eleventyConfig.addFilter('isString', filters.isStringFilter);

		// --- Shortcodes ---
		eleventyConfig.addShortcode('image', shortcodes.imageShortcode);

		// --- Image dev server ---
		// Serves on-demand image transforms during `--serve` without writing to disk.
		eleventyConfig.addPlugin(eleventyImageOnRequestDuringServePlugin);

		// --- Debug ---
		// Underscore-prefixed filters and navigator template for inspecting
		// data at render time. Not part of the public API surface.
		eleventyConfig.addFilter('_inspect', debug.inspect);
		eleventyConfig.addFilter('_json', debug.json);
		eleventyConfig.addFilter('_keys', debug.keys);
		eleventyConfig.addPlugin(modules.navigatorCore, { enableNavigatorTemplate: userOptions.enableNavigatorTemplate });
	};

	// Set a named function identity so eleventyConfig.hasPlugin() can detect this plugin.
	Object.defineProperty(plugin, 'name', { value: `${name}` });
	return plugin;
}

// --- Eleventy directory and template config ---
// Exported separately so consuming sites can re-export without duplicating values.
export const config = {
	dir: {
		input: 'src',
		output: 'dist',
		data: '_data',
		includes: '_includes',
		assets: 'assets'
	},
	htmlTemplateEngine: 'njk',
	markdownTemplateEngine: 'njk',
	templateFormats: ['html', 'njk', 'md']
};
