import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function sitemapCore(eleventyConfig, options = {}) {
	const userOptions = {
		enableSitemapTemplate: options.enableSitemapTemplate ?? true,
		multilingual: options.multilingual,
		languages: options.languages
	};

	eleventyConfig.addGlobalData("eleventyComputed.page.sitemap", () => {
		return (data) => ({
			ignore: data.site?.noindex ?? false,
			changefreq: "",
			priority: -1
		});
	});

	if (userOptions.enableSitemapTemplate) {
		const templatePath = path.join(__dirname, "../templates/sitemap-core.html");
		const indexTemplatePath = path.join(__dirname, "../templates/sitemap-index.html");
		const baseContent = fs.readFileSync(templatePath, "utf-8");
		const indexContent = fs.readFileSync(indexTemplatePath, "utf-8");

		const languages = userOptions.languages || {};
		const langKeys = Array.isArray(languages) ? languages : Object.keys(languages);
		const multilingual = typeof userOptions.multilingual === "boolean" ? userOptions.multilingual : langKeys.length > 1;

		if (multilingual && langKeys.length > 1) {
			for (const lang of langKeys) {
				eleventyConfig.addTemplate(`_baseline/sitemap-core-${lang}.html`, baseContent, {
					permalink: `${lang}/sitemap.xml`,
					title: "",
					description: "",
					layout: null,
					eleventyExcludeFromCollections: true,
					isMultilingual: multilingual,
					sitemapLang: lang
				});
			}

			eleventyConfig.addTemplate("_baseline/sitemap-index.html", indexContent, {
				permalink: "/sitemap.xml",
				title: "",
				description: "",
				layout: null,
				eleventyExcludeFromCollections: true,
				isMultilingual: multilingual
			});
		} else {
			eleventyConfig.addTemplate("_baseline/sitemap-core.html", baseContent, {
				permalink: "/sitemap.xml",
				title: "",
				description: "",
				layout: null,
				eleventyExcludeFromCollections: true
			});
		}
	}
}
