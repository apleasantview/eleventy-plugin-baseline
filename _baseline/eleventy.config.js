import "dotenv/config";
import globals from "./core/globals.js";
import debug from "./core/debug.js";
import filters from "./core/filters.js";
import modules from "./core/modules.js";
import shortcodes from "./core/shortcodes.js";

/**
 * Eleventy Plugin Baseline
 *
 * Options (with defaults):
 * - verbose?: boolean — enable extra logging. Default: false.
 * - enableNavigatorTemplate?: boolean — register navigator template/routes. Default: false.
 * - enableSitemapTemplate?: boolean — register sitemap template/routes. Default: true.
 * - multilingual?: boolean — enable multilang core (requires defaultLanguage + languages). Default: false.
 * - defaultLanguage?: string — IETF/BCP47 code for the default language (used when multilingual=true). Default: undefined.
 * - languages?: Record<string, unknown> — map of language definitions (any shape; only presence/keys are checked). Default: {}.
 *
 * @param {object} options - Custom options for the plugin.
 * @returns {(eleventyConfig: UserConfig) => void}
 */
export default function baseline(options = {}) {
	/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
	return async function (eleventyConfig) {
		try {
			// Emit a warning message if the application is not using Eleventy 3.0 or newer (including prereleases).
			eleventyConfig.versionCheck(">=3.0");
		} catch (e) {
			console.log(`[eleventy-plugin-baseline] WARN Eleventy plugin compatibility: ${e.message}`);
		}

		const userOptions = {
			verbose: options.verbose ?? false,
			enableNavigatorTemplate: options.enableNavigatorTemplate ?? false,
			enableSitemapTemplate: options.enableSitemapTemplate ?? true,
			multilingual: options.multilingual ?? false,
			...options
		};

		// Core functions.
		// Languages are expected as an object map; if missing or invalid, skip.
		const languages = userOptions.languages && typeof userOptions.languages === "object"
			? userOptions.languages : null;
		const hasLanguages = languages && Object.keys(languages).length > 0;
		const isMultilingual = userOptions.multilingual === true && userOptions.defaultLanguage && hasLanguages;

		eleventyConfig.addGlobalData("_baseline", userOptions);
		globals(eleventyConfig);
		eleventyConfig.addPassthroughCopy({ "./src/static": "/" }, { failOnError: true });
		eleventyConfig.addPreprocessor("drafts", "*", (data, content) => {
			if (data.draft && process.env.ELEVENTY_RUN_MODE === "build") {
				return false;
			}
		});

		if (isMultilingual) {
			eleventyConfig.addPlugin(modules.multilangCore, {
				defaultLanguage: userOptions.defaultLanguage,
				languages
			});
		}

		// Modules.
		eleventyConfig.addPlugin(modules.EleventyHtmlBasePlugin, { baseHref: process.env.URL || eleventyConfig.pathPrefix });
		eleventyConfig.addPlugin(modules.assetsCore);
		eleventyConfig.addPlugin(modules.assetsPostCSS);
		eleventyConfig.addPlugin(modules.assetsESBuild);
		eleventyConfig.addPlugin(modules.headCore);
		eleventyConfig.addPlugin(modules.sitemapCore, { enableSitemapTemplate: userOptions.enableSitemapTemplate, multilingual: isMultilingual, languages });

		// Filters — Module filters might move to their respective module.
		eleventyConfig.addFilter("markdownify", filters.markdownFilter);
		eleventyConfig.addFilter("relatedPosts", filters.relatedPostsFilter);
		eleventyConfig.addFilter("isString", filters.isStringFilter);

		// Shortcodes.
		eleventyConfig.addShortcode("image", shortcodes.imageShortcode);

		// Debug filters and navigators.
		eleventyConfig.addFilter("_inspect", debug.inspect);
		eleventyConfig.addFilter("_json", debug.json);
		eleventyConfig.addFilter("_keys", debug.keys);
		eleventyConfig.addPlugin(modules.navigatorCore, { enableNavigatorTemplate: userOptions.enableNavigatorTemplate });
	};
}

export const config = {
	dir: {
		input: "src",
		output: "dist",
		data: "_data",
		includes: "_includes",
		assets: "assets"
	},
	htmlTemplateEngine: "njk",
	markdownTemplateEngine: "njk",
	templateFormats: ["html", "njk", "md"]
};
