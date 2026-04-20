import path from 'node:path';
import { TemplatePath } from '@11ty/eleventy-utils';
import { addTrailingSlash, resolveAssetsDir } from '../../core/helpers.js';
import { createLogger } from '../../core/logging.js';

import assetsESbuild from '../assets-esbuild/process.js';
import assetsPostCSS from '../assets-postcss/process.js';

/**
 * Sync the cache object with resolved directory paths.
 * Called once at registration time and again on the eleventy.directories event
 * when Eleventy finalizes its directory config.
 */
const syncCacheFromDirectories = (cache, dirs, rawDir) => {
	const inputDir = TemplatePath.addLeadingDotSlash(dirs.input || './');
	const outputDir = TemplatePath.addLeadingDotSlash(dirs.output || './');
	const { assetsDir, assetsOutputDir } = resolveAssetsDir(inputDir, outputDir, rawDir);

	cache.input = addTrailingSlash(inputDir);
	cache.output = addTrailingSlash(outputDir);
	cache.assetsInput = assetsDir;
	cache.assetsOutput = assetsOutputDir;
};

/**
 * Guard: resolve directories from eleventyConfig.dir if the eleventy.directories
 * event hasn't fired yet (e.g. when global data or watch targets are read early).
 */
const ensureCache = (cache, eleventyConfig, rawDir, log) => {
	if (cache.assetsInput) return;
	syncCacheFromDirectories(cache, eleventyConfig.dir || {}, rawDir);
	log.info('Fallback directory resolution');
};

/**
 * eleventy-plugin-assets-core
 *
 * The single assets plugin. Owns all Eleventy wiring for JS and CSS processing:
 * directory resolution, template formats, extensions, compile guards, inline
 * filters, watch targets, and global data. Processing logic lives in the
 * pure functions imported from assets-esbuild and assets-postcss.
 *
 * Options:
 *  - verbose  (boolean, default false): enable verbose logs. Passed in from the plugin root.
 *  - esbuild  (object): options forwarded to esbuild (minify, target).
 *    Defaults live in assets-esbuild/process.js — pass only overrides.
 */
/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function assetsCore(eleventyConfig, options = {}) {
	const log = createLogger('assets-core', { verbose: options.verbose });
	const userKey = 'assets';

	// Extract raw directory value from config (can be done early).
	const rawDir = eleventyConfig.dir?.[userKey] || userKey;

	// Cache holds resolved paths. Initialized as nulls, populated immediately
	// by syncCacheFromDirectories, then updated when eleventy.directories fires.
	const cache = {
		input: null,
		output: null,
		assetsInput: null,
		assetsOutput: null
	};

	syncCacheFromDirectories(cache, eleventyConfig.dir || {}, rawDir);

	// Update cache when Eleventy finalizes directories, and register a virtual
	// `directories.assets` key so other code can read the resolved assets path.
	eleventyConfig.on('eleventy.directories', (directories) => {
		syncCacheFromDirectories(cache, directories, rawDir);

		// Add a virtual directory key only if not already defined/configurable.
		const existing = Object.getOwnPropertyDescriptor(eleventyConfig.directories, userKey);
		if (existing && existing.configurable === false) {
			log.info(`directories[${userKey}] already defined; skipping`);
			return;
		}

		Object.defineProperty(eleventyConfig.directories, userKey, {
			get() {
				return cache.assetsInput;
			},
			enumerable: true,
			configurable: false
		});
	});

	// Expose resolved assets paths as global data for templates.
	// Templates use _baseline.assets.input to build paths for inline filters.
	eleventyConfig.addGlobalData('_baseline.assets', () => {
		ensureCache(cache, eleventyConfig, rawDir, log);
		return {
			input: cache.assetsInput,
			output: cache.assetsOutput
		};
	});

	// Watch common asset formats so edits trigger reloads during --serve.
	ensureCache(cache, eleventyConfig, rawDir, log);
	const watchGlob = TemplatePath.join(cache.assetsInput, '**/*.{css,js,svg,png,jpeg,jpg,webp,gif,avif}');
	eleventyConfig.addWatchTarget(watchGlob);

	// --- JS (esbuild) ---
	// Register js as a template format. Only index.js files under assets/js/
	// are compiled; everything else (11tydata.js, non-entry scripts) is skipped
	// by the compile guard. The inline filter wraps the same process function.
	// Defaults (minify, target) live in assets-esbuild/process.js.

	const esbuildOptions = options.esbuild || {};
	const jsDir = `${cache.assetsInput}js/`;

	eleventyConfig.addTemplateFormats('js');

	// Prevent Eleventy from processing 11tydata.js files as templates.
	// The compile guard below also filters these, but without this ignore
	// Eleventy still enters them into the template graph (data cascade,
	// permalink computation) before compile gets a chance to reject them.
	eleventyConfig.ignores.add(`${cache.input}**/*.11tydata.js`);

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
				!inputPath.startsWith(jsDir) ||
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

	const cssDir = `${cache.assetsInput}css/`;

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
			if (!inputPath.startsWith(cssDir) || path.basename(inputPath) !== 'index.css') {
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
