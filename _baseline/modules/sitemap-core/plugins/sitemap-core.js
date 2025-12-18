import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function sitemapCore(eleventyConfig, options = {}) {
	const userOptions = {
		enableSitemapTemplate: options.enableSitemapTemplate ?? true
	}

	eleventyConfig.addGlobalData("eleventyComputed.page.sitemap", () => {
		return (data) => ({
			ignore: data.site?.noindex ?? false,
			changefreq: "",
			priority: -1
		});
	});

	if (userOptions.enableSitemapTemplate) {
		// Read virtual template synchronously; Nunjucks pipeline here is sync-only.
		const templatePath = path.join(__dirname, "../templates/sitemap-core.html");
		const virtualTemplateContent = fs.readFileSync(templatePath, "utf-8");
		eleventyConfig.addTemplate("_baseline/sitemap-core.html", virtualTemplateContent, {
			permalink: "/sitemap.xml",
			title: "",
			description: "",
			layout: null,
			eleventyExcludeFromCollections: true
		});
	}
 }
