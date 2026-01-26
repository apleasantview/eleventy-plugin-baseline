import path from 'node:path';
import * as esbuild from 'esbuild';
import { resolveAssetsDir } from '../../../core/helpers.js';
import inlineESbuild from '../filters/inline-esbuild.js';

/**
 * assets-esbuild
 *
 * - Registers `js` as a template format and bundles/minifies `index.js` entries under the resolved assets `js` dir.
 * - Registers `inlineESbuild` filter to inline arbitrary JS by bundling it with esbuild.
 * - Filters the `all` collection to drop `11tydata.js` files (added by the `js` template format).
 *
 * Options:
 * - minify (boolean, default true): pass-through to esbuild minify flag.
 * - target (string|string[], default "es2020"): pass-through to esbuild target.
 */
/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function assetsESBuild(eleventyConfig, options = {}) {
	const defaultOptions = { minify: true, target: 'es2020' };
	const { assetsDir } = resolveAssetsDir(
		eleventyConfig.dir?.input || './',
		eleventyConfig.dir?.output || './',
		eleventyConfig.dir?.assets || 'assets'
	);
	const jsDir = `${assetsDir}js/`;
	const userOptions = { ...defaultOptions, ...options };

	eleventyConfig.addTemplateFormats('js');

	eleventyConfig.addExtension('js', {
		outputFileExtension: 'js',
		useLayouts: false,
		compile: async function (_inputContent, inputPath) {
			if (
				inputPath.includes('11tydata.js') ||
				!inputPath.startsWith(jsDir) ||
				path.basename(inputPath) !== 'index.js'
			) {
				return;
			}

			return async () => {
				let result = await esbuild.build({
					entryPoints: [inputPath],
					bundle: true,
					minify: userOptions.minify,
					target: userOptions.target,
					write: false
				});

				return result.outputFiles[0].text;
			};
		}
	});

	// Filter to inline a bundled entry; supports callback style (Nunjucks/Liquid) and Promise return.
	eleventyConfig.addAsyncFilter('inlineESbuild', async function (jsFilePath, callback) {
		const done = typeof callback === 'function' ? callback : null;
		try {
			const js = await inlineESbuild(jsFilePath);
			const html = `<script>${js}</script>`;
			if (done) return done(null, html);
			return html;
		} catch {
			// Non-fatal fallback: return an error comment wrapped in script tags.
			const html = `<script>/* Error processing JS */</script>`;
			if (done) return done(null, html);
			return html;
		}
	});
}
