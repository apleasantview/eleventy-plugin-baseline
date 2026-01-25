import path from 'node:path';
import postcss from 'postcss';
import loadPostCSSConfig from 'postcss-load-config';
import fallbackPostCSSConfig from '../fallback/postcss.config.js';
import inlinePostCSS from '../filters/inline-postcss.js';
import { resolveAssetsDir } from '../../../core/helpers.js';

/**
 * assets-postcss
 *
 * - Registers `css` as a template format and processes `index.css` entries under the resolved assets `css` dir with PostCSS.
 * - Registers `inlinePostCSS` filter to inline arbitrary CSS by processing it with PostCSS.
 * - No module-specific options (inherits global Baseline verbose only).
 */
/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function assetsPostCSS(eleventyConfig) {
	const { assetsDir } = resolveAssetsDir(
		eleventyConfig.dir?.input || './',
		eleventyConfig.dir?.output || './',
		eleventyConfig.dir?.assets || 'assets'
	);
	const cssDir = `${assetsDir}css/`;

	// Resolve user PostCSS config from the project root (cwd), not the Eleventy input dir.
	const configRoot = process.cwd();

	eleventyConfig.addTemplateFormats('css');

	eleventyConfig.addExtension('css', {
		outputFileExtension: 'css',
		useLayouts: false,
		compile: async function (_inputContent, inputPath) {
			if (!inputPath.startsWith(cssDir) || path.basename(inputPath) !== 'index.css') {
				return;
			}

			return async () => {
				let plugins;
				let options;

				try {
					// Prefer the consuming project's PostCSS config (postcss.config.* or package.json#postcss).
					({ plugins, options } = await loadPostCSSConfig({}, configRoot));
				} catch {
					// If none is found, fall back to the bundled Baseline config to keep builds working.
					({ plugins, ...options } = fallbackPostCSSConfig);
				}

				const result = await postcss(plugins).process(_inputContent, {
					from: inputPath,
					map: options?.map,
					...options
				});

				return result.css;
			};
		}
	});

	// Filter to inline a bundled entry; supports callback style (Nunjucks/Liquid) and Promise return.
	eleventyConfig.addAsyncFilter('inlinePostCSS', async function (cssFilePath, callback) {
		const done = typeof callback === 'function' ? callback : null;
		try {
			const css = await inlinePostCSS(cssFilePath);
			const html = `<style>${css}</style>`;
			if (done) return done(null, html);
			return html;
		} catch {
			// Keep behavior non-fatal: return a styled error comment instead of throwing.
			const html = `<style>/* Error processing CSS */</style>`;
			if (done) return done(null, html);
			return html;
		}
	});
}
