import "dotenv/config";
import debug from "./debug.js";
import filters from "./filters.js";
import modules from "./modules.js";
import shortcodes from "./shortcodes.js";

/**
 * Eleventy Plugin Baseline
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
			console.log(`[eleventy-baseline] WARN Eleventy plugin compatibility: ${e.message}`);
		}

		const userOptions = {
			verbose: options.verbose ?? false,
			enableNavigatorTemplate: options.enableNavigatorTemplate ?? false,
			...options
		};

		// Core  functions.
		eleventyConfig.addGlobalData("_baseline", userOptions);
		eleventyConfig.addPassthroughCopy({ "./src/static": "/" }, { failOnError: true });

		// Watch target — Possibly moving this to assets-core.
		eleventyConfig.addWatchTarget('./src/assets/**/*.{css,js,svg,png,jpeg}');

		// Modules.
		eleventyConfig.addPlugin(modules.EleventyHtmlBasePlugin, { baseHref: process.env.URL || eleventyConfig.pathPrefix });
		eleventyConfig.addPlugin(modules.syntaxHighlight);
		eleventyConfig.addPlugin(modules.assetsCore);
		eleventyConfig.addPlugin(modules.assetsPostCSS);
		eleventyConfig.addPlugin(modules.assetsESBuild);
		eleventyConfig.addPlugin(modules.headCore);

		// Filters — Module filters might move to their respective module.
		eleventyConfig.addFilter("markdownify", filters.markdownFilter);
		eleventyConfig.addFilter("relatedPosts", filters.relatedPostsFilter);
		eleventyConfig.addFilter("inlinePostCSS", filters.inlinePostCSS);
		eleventyConfig.addFilter("inlineESbuild", filters.inlineESbuild);
		eleventyConfig.addFilter("isString", filters.isStringFilter);

		// Shortcodes.
		eleventyConfig.addShortcode("image", shortcodes.imageShortcode);

		// Debug filters and navigators.
		eleventyConfig.addFilter("inspect", debug.inspect);
		eleventyConfig.addFilter("json", debug.json);
		eleventyConfig.addFilter("keys", debug.keys);
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
