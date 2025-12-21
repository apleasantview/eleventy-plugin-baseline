/* Site config */
import "dotenv/config";

import baseline from "./_baseline/eleventy.config.js";
import { config as _config } from "./_baseline/eleventy.config.js";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";

import lang from "./src/_data/languages.js";

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default async function (eleventyConfig) {
	// Import baseline
	eleventyConfig.addPlugin(baseline({
		verbose: false,
		enableNavigatorTemplate: true,
		multilingual: true,
		defaultLanguage: lang.defaultLanguage,
		languages: lang.languages,
		Bob: "My number one guy."
	}));

	eleventyConfig.addPlugin(syntaxHighlight);

	eleventyConfig.addCollection("docs", function (collectionApi) {
		const docs = collectionApi.getFilteredByGlob("src/content/en/docs/**/*.md");
		return docs.sort(function (a, b) {
			return a.inputPath.localeCompare(b.inputPath);
		});
	});

	eleventyConfig.addPairedNunjucksShortcode("alertBlock", function(text, alert = "info") { 
		const res = this.env.render("components/alerts.njk", {
			content: text,
			type: alert
		});
		return res;
	});
};

export const config = _config;
