import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getVerbose } from "../../../helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function(eleventyConfig, options = {}) {
  eleventyConfig.addNunjucksGlobal("_navigator", function() {
		return this;
	})

	if (getVerbose(eleventyConfig)) {
		// Read virtual template synchronously; Nunjucks pipeline here is sync-only.
		const templatePath = path.join(__dirname, "../templates/core-navigator.html");
		const virtualTemplateContent = fs.readFile(templatePath, "utf-8");
	
		eleventyConfig.addTemplate("core-navigator.html", virtualTemplateContent, {
			permalink: "/core-navigator/",
			title: "Core Navigator",
			meta: "Very important page",
		});
	};
}
