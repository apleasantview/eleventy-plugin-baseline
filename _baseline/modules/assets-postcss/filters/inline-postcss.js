import fs from "fs/promises";
import postcss from "postcss";
import loadPostCSSConfig from "postcss-load-config";
import fallbackPostCSSConfig from "../fallback/postcss.config.js";

export default async function inlinePostCSS(cssFilePath) {
	try {
		let cssContent = await fs.readFile(cssFilePath, 'utf8');

		let plugins;
		let options;

		try {
			// Prefer the consuming project's PostCSS config (postcss.config.* or package.json#postcss).
			({ plugins, options } = await loadPostCSSConfig({}, configRoot));
		} catch (error) {
			// If none is found, fall back to the bundled Baseline config to keep builds working.
			({plugins, ...options } = fallbackPostCSSConfig);
		}

		let result = await postcss(plugins).process(cssContent, {
			from: cssFilePath,
			map: options?.map
		});

		return `<style>${result.css}</style>`;
	} catch (error) {
		console.error(error);
		return `<style>/* Error processing CSS */</style>`;
	}
} 
