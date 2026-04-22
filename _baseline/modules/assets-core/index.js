import path from 'node:path';
import { TemplatePath } from '@11ty/eleventy-utils';

import { optionsSchema } from './schema.js';
import assetsESbuild from '../assets-esbuild/process.js';
import assetsPostCSS from '../assets-postcss/process.js';

/**
 * eleventy-plugin-assets-core
 *
 * The single assets plugin. Owns all Eleventy wiring for JS and CSS processing:
 * template formats, extensions, compile guards, inline filters, and watch
 * targets. Directory resolution (the virtual `directories.assets` key and the
 * `_baseline.assets` global) is handled by core/virtual-dir.js, registered at
 * the plugin entry point. Processing logic lives in the pure functions
 * imported from assets-esbuild and assets-postcss.
 *
 * Options:
 *  - verbose  (boolean, default false): enable verbose logs. Passed in from the plugin root.
 *  - esbuild  (object): options forwarded to esbuild (minify, target).
 *    Defaults live in assets-esbuild/process.js — pass only overrides.
 */
/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function assetsCore(eleventyConfig, moduleContext) {
	const { state, directories, log } = moduleContext;
	const options = state.options;
	const parsed = optionsSchema.safeParse(options);

	// Structural-only options check: log on mismatch, do not throw.
	if (!parsed.success) {
		for (const issue of parsed.error.issues) {
			log.info('options:', `${issue.path.join('.')} — ${issue.message}`);
		}
	}

	const inputDirectory = directories.input;
	const assetsDirectory = directories.assets;
	const jsDirectory = `${assetsDirectory}js/`;
	const cssDirectory = `${assetsDirectory}css/`;

	const esbuildOptions = options.assets.esbuild || {};
	const dataFiles = `${inputDirectory}**/*.11tydata.js`;
	const watchGlob = TemplatePath.join(assetsDirectory, '**/*.{css,js,svg,png,jpeg,jpg,webp,gif,avif}');

	if (!assetsDirectory) {
		log.warn('eleventyConfig.directories.assets is unset; registerVirtualDir must run before this plugin.');
		return;
	}

	// Watch common asset formats so edits trigger reloads during --serve.
	eleventyConfig.addWatchTarget(watchGlob);

	// --- JS (esbuild) ---
	// Register js as a template format. Only index.js files under assets/js/
	// are compiled; everything else (11tydata.js, non-entry scripts) is skipped
	// by the compile guard. The inline filter wraps the same process function.
	// Defaults (minify, target) live in assets-esbuild/process.js.

	eleventyConfig.addTemplateFormats('js');

	// Prevent Eleventy from processing 11tydata.js files as templates.
	// The compile guard below also filters these, but without this ignore
	// Eleventy still enters them into the template graph (data cascade,
	// permalink computation) before compile gets a chance to reject them.
	eleventyConfig.ignores.add(dataFiles);

	eleventyConfig.addExtension('js', {
		outputFileExtension: 'js',
		useLayouts: false,
		read: false,
		compileOptions: {
			permalink: true,
			cache: true
		},
		// Compile guard: only process index.js files under the assets js directory.
		// Returning undefined skips the file without error.
		compile: async function (_inputContent, inputPath) {
			if (
				inputPath.includes('11tydata.js') ||
				!inputPath.startsWith(jsDirectory) ||
				path.basename(inputPath) !== 'index.js'
			) {
				return;
			}

			return async () => assetsESbuild(inputPath, esbuildOptions);
		}
	});

	// Inline filter: bundle a JS file and wrap in <script> tags.
	// Accepts per-call esbuild options (merged with defaults in process.js).
	// Eleventy's addAsyncFilter handles the Nunjucks callback bridge,
	// so this is a plain async function.
	eleventyConfig.addAsyncFilter('inlineESbuild', async function (inputPath, opts = {}) {
		try {
			const js = await assetsESbuild(inputPath, opts);
			return `<script>${js}</script>`;
		} catch {
			// Non-fatal: return an error comment so the build doesn't break.
			return `<script>/* Error processing JS */</script>`;
		}
	});

	// --- CSS (PostCSS) ---
	// Register css as a template format. Only index.css files under assets/css/
	// are compiled; non-entry CSS is skipped. Reads from disk (read: false) —
	// the process function owns its own I/O. Config loading and caching live
	// in assets-postcss/process.js.

	eleventyConfig.addTemplateFormats('css');

	eleventyConfig.addExtension('css', {
		outputFileExtension: 'css',
		useLayouts: false,
		read: false,
		compileOptions: {
			permalink: true,
			cache: true
		},
		// Compile guard: only process index.css files under the assets css directory.
		compile: async function (_inputContent, inputPath) {
			if (!inputPath.startsWith(cssDirectory) || path.basename(inputPath) !== 'index.css') {
				return;
			}

			return async () => assetsPostCSS(inputPath);
		}
	});

	// Inline filter: process a CSS file through PostCSS and wrap in <style> tags.
	// Eleventy's addAsyncFilter handles the Nunjucks callback bridge,
	// so this is a plain async function.
	eleventyConfig.addAsyncFilter('inlinePostCSS', async function (inputPath) {
		try {
			const css = await assetsPostCSS(inputPath);
			return `<style>${css}</style>`;
		} catch {
			// Non-fatal: return an error comment so the build doesn't break.
			return `<style>/* Error processing CSS */</style>`;
		}
	});
}
