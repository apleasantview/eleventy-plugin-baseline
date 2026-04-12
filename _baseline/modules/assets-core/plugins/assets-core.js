import path from 'node:path';
import { TemplatePath } from '@11ty/eleventy-utils';
import { addTrailingSlash, resolveAssetsDir } from '../../../core/helpers.js';
import { warnIfVerbose, getVerbose } from '../../../core/logging.js';

import assetsESbuild from '../../assets-esbuild/process.js';
import assetsPostCSS from '../../assets-postcss/process.js';

const syncCacheFromDirectories = (cache, dirs, rawDir) => {
	const inputDir = TemplatePath.addLeadingDotSlash(dirs.input || './');
	const outputDir = TemplatePath.addLeadingDotSlash(dirs.output || './');
	const { assetsDir, assetsOutputDir } = resolveAssetsDir(inputDir, outputDir, rawDir);

	cache.input = addTrailingSlash(inputDir);
	cache.output = addTrailingSlash(outputDir);
	cache.assetsInput = assetsDir;
	cache.assetsOutput = assetsOutputDir;
};

const ensureCache = (cache, eleventyConfig, rawDir, verbose) => {
	if (cache.assetsInput) return;
	syncCacheFromDirectories(cache, eleventyConfig.dir || {}, rawDir);
	warnIfVerbose(verbose, 'Fallback directory resolution');
};

/**
 * eleventy-plugin-assets-core
 *
 * Resolve assets input/output directories, register a virtual
 * `directories.assets`, expose the resolved paths via global data, and add
 * a watch target under the resolved assets input directory.
 *
 * Options:
 *  - verbose  (boolean, default global baseline verbose): enable verbose logs.
 *  - esbuild  (object): options forwarded to esbuild (minify, target).
 */
/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function assetsCore(eleventyConfig, options = {}) {
	const verbose = getVerbose(eleventyConfig) || options.verbose || false;
	const userKey = 'assets';

	// Extract raw directory value from config (can be done early)
	const rawDir = eleventyConfig.dir?.[userKey] || userKey;

	// Cache object (raw values; normalized later by syncCacheFromDirectories)
	const cache = {
		input: eleventyConfig.dir?.input || null,
		output: eleventyConfig.dir?.output || null,
		assetsInput: eleventyConfig.dir?.assets ?? userKey ?? null,
		assetsOutput: null
	};

	syncCacheFromDirectories(cache, eleventyConfig.dir || {}, rawDir);

	eleventyConfig.on('eleventy.directories', (directories) => {
		syncCacheFromDirectories(cache, directories, rawDir);

		// Add a virtual directory key only if not already defined/configurable.
		const existing = Object.getOwnPropertyDescriptor(eleventyConfig.directories, userKey);
		if (existing && existing.configurable === false) {
			warnIfVerbose(verbose, `directories[${userKey}] already defined; skipping`);
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

	eleventyConfig.addGlobalData('_baseline.assets', () => {
		ensureCache(cache, eleventyConfig, rawDir, verbose);
		// Merge with existing _baseline.assets (e.g., esbuild config)
		const existing = eleventyConfig.globalData?._baseline?.assets || {};
		return {
			input: cache.assetsInput,
			output: cache.assetsOutput,
			...existing
		};
	});

	// Watch target — use resolved assets input dir.
	ensureCache(cache, eleventyConfig, rawDir, verbose);
	const watchGlob = TemplatePath.join(cache.assetsInput, '**/*.{css,js,svg,png,jpeg,jpg,webp,gif,avif}');
	eleventyConfig.addWatchTarget(watchGlob);

	// --- JS (esbuild) ---

	const esbuildDefaults = { minify: true, target: 'es2020' };
	const esbuildOptions = { ...esbuildDefaults, ...options.esbuild };
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

	eleventyConfig.addAsyncFilter('inlineESbuild', async function (inputPath, callback) {
		const done = typeof callback === 'function' ? callback : null;
		try {
			const js = await assetsESbuild(inputPath);
			const html = `<script>${js}</script>`;
			if (done) return done(null, html);
			return html;
		} catch {
			const html = `<script>/* Error processing JS */</script>`;
			if (done) return done(null, html);
			return html;
		}
	});

	// --- CSS (PostCSS) ---
	const cssDir = `${cache.assetsInput}css/`;

	// Resolve user PostCSS config from the project root (cwd), not the Eleventy input dir.
	const configRoot = process.cwd();

	eleventyConfig.addTemplateFormats('css');

	eleventyConfig.addExtension('css', {
		outputFileExtension: 'css',
		useLayouts: false,
		read: false,
		compileOptions: {
			permalink: true,
			cache: true
		},
		compile: async function (_inputContent, inputPath) {
			if (!inputPath.startsWith(cssDir) || path.basename(inputPath) !== 'index.css') {
				return;
			}

			return async () => assetsPostCSS(inputPath);
		}
	});

	// Filter to inline a bundled entry; supports callback style (Nunjucks/Liquid) and Promise return.
	eleventyConfig.addAsyncFilter('inlinePostCSS', async function (inputPath, callback) {
		const done = typeof callback === 'function' ? callback : null;
		try {
			const css = await assetsPostCSS(inputPath);
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
