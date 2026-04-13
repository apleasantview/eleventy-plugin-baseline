import 'dotenv/config';
import globals from './core/globals.js';
import debug from './core/debug.js';
import filters from './core/filters.js';
import modules from './core/modules.js';
import shortcodes from './core/shortcodes.js';
import { eleventyImageOnRequestDuringServePlugin } from '@11ty/eleventy-img';

import { createRequire } from 'node:module';
const __require = createRequire(import.meta.url);

const { name, version } = __require('./package.json');

/**
 * Eleventy Plugin Baseline.
 *
 * @typedef {Object} BaselineOptions
 * @property {boolean} [verbose=false] Enable extra logging from the plugin.
 * @property {boolean} [enableNavigatorTemplate=false] Register navigator template/routes.
 * @property {boolean} [enableSitemapTemplate=true] Register sitemap template/routes.
 * @property {boolean} [multilingual=false] Enable multilang core (requires defaultLanguage + languages).
 * @property {string} [defaultLanguage] IETF/BCP47 default language code (used when multilingual=true).
 * @property {Record<string, unknown>} [languages={}] Language definition map (shape not enforced; only presence/keys checked).
 * @property {Object} [assetsESBuild] Options forwarded to assets-esbuild (minify/target).
 *
 * @param {BaselineOptions} [options={}] Custom options for the plugin.
 * @returns {(eleventyConfig: import("@11ty/eleventy").UserConfig) => Promise<void>}
 */
export default function baseline(options = {}) {
	/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
	const plugin = async function (eleventyConfig) {
		try {
			eleventyConfig.versionCheck('>=3.0');
		} catch (e) {
			console.log(`[eleventy-plugin-baseline] WARN Eleventy plugin compatibility: ${e.message}`);
		}

		// --- Options ---
		// Merge user options with defaults, detect environment capabilities,
		// and expose everything as _baseline global data for templates.
		const hasImageTransformPlugin = eleventyConfig.hasPlugin('eleventyImageTransformPlugin');

		const userOptions = {
			version,
			name,
			verbose: options.verbose ?? false,
			hasImageTransformPlugin,
			enableNavigatorTemplate: options.enableNavigatorTemplate ?? false,
			enableSitemapTemplate: options.enableSitemapTemplate ?? true,
			filterAllCollection: options.filterAllCollection ?? true,
			assets: {
				esbuild: options.assetsESBuild ?? {}
			},
			multilingual: options.multilingual ?? false,
			...options
		};

		// --- Language normalization ---
		// Accept languages as array or object; normalize to object map.
		// Drives multilang-core registration and sitemap-core language config.
		const normalizedLanguages = Array.isArray(userOptions.languages)
			? Object.fromEntries(
					userOptions.languages
						.filter((lang) => typeof lang === 'string' && lang.trim())
						.map((lang) => [lang.trim(), {}])
				)
			: userOptions.languages && typeof userOptions.languages === 'object'
				? userOptions.languages
				: null;

		if (userOptions.verbose && Array.isArray(userOptions.languages)) {
			const normalizedCount = normalizedLanguages ? Object.keys(normalizedLanguages).length : 0;
			if (normalizedCount !== userOptions.languages.length) {
				console.warn('[baseline] Some languages entries were invalid and were dropped.');
			}
		}

		userOptions.languages = normalizedLanguages;
		const languages = normalizedLanguages;
		const hasLanguages = languages && Object.keys(languages).length > 0;
		const isMultilingual = userOptions.multilingual === true && userOptions.defaultLanguage && hasLanguages;

		// --- Core setup ---
		// Global data, globals registration, static passthrough, drafts preprocessor.
		eleventyConfig.addGlobalData('_baseline', userOptions);
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

		if (isMultilingual) {
			eleventyConfig.addPlugin(modules.multilangCore, {
				defaultLanguage: userOptions.defaultLanguage,
				languages
			});
		}

		eleventyConfig.addPlugin(modules.EleventyHtmlBasePlugin, {
			baseHref: process.env.URL || eleventyConfig.pathPrefix
		});
		eleventyConfig.addPlugin(modules.assetsCore, { esbuild: userOptions.assets.esbuild });

		eleventyConfig.addPlugin(modules.headCore);
		eleventyConfig.addPlugin(modules.sitemapCore, {
			enableSitemapTemplate: userOptions.enableSitemapTemplate,
			multilingual: isMultilingual,
			languages
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

		// Temporary content map debug listener.
		eleventyConfig.on('eleventy.contentMap', async ({ inputPathToUrl, urlToInputPath }) => {
			let debuginput = inputPathToUrl;
			let debugurl = urlToInputPath;

			return (debuginput, debugurl);
		});
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
