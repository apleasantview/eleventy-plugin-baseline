import fs from "fs/promises";
import postcss from "postcss";
import postcssConfig from "../../../../postcss.config.js";

export default async function inlinePostCSS(cssFilePath) {
	try {
		let cssContent = await fs.readFile(cssFilePath, 'utf8');

		let result = await postcss(postcssConfig.plugins).process(cssContent, {
			from: cssFilePath,
			map: postcssConfig.map
		});

		return `<style>${result.css}</style>`;
	} catch (error) {
		console.error(error);
		return `<style>/* Error processing CSS */</style>`;
	}
} 
