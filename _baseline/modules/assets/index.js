import path from 'node:path';

import { TemplatePath } from '@11ty/eleventy-utils';

import { optionsSchema } from './schema.js';
import assetsESbuild from './processors/esbuild-process.js';
import assetsPostCSS from './processors/postcss-process.js';
import { collectDeclaredPaths, findMissingAssets } from './utils/declared-assets.js';

/**
 * Assets (module)
 *
 * Asset pipeline integration. Wires Eleventy’s template formats to esbuild
 * and PostCSS through compile guards that allow only declared entrypoints,
 * and exposes inline filters for critical-path assets.
 *
 * Architecture layer:
 *   module
 *
 * System role:
 *   Bridge between Eleventy’s template system and the external asset
 *   processors. Reads `directories.assets` from the virtual-dir substrate.
 *
 * Lifecycle:
 *   build-time → register js/css formats, compile guards, watch target, and
 *                inline filters; guards run per-entrypoint during compile
 *
 * Why this exists:
 *   Eleventy treats every .js and .css file as a template. Without compile
 *   guards, 11tydata.js files and non-entry assets would either pollute the
 *   template graph or trigger the wrong processor.
 *
 * Scope:
 *   Owns template format registration, compile guards, watch wiring, and the
 *   inline filters (inlinePostCSS, inlineESbuild).
 *   Does not own the processors themselves (assets/processors/) or
 *   `directories.assets` resolution (core/virtual-dir.js).
 *
 * Data flow:
 *   assets/{js,css}/index.{js,css} entrypoints → compile guard →
 *   esbuild/PostCSS processor → output
 *
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * @param {Object} moduleContext
 */
export function assetsCore(eleventyConfig, moduleContext) {
	const { state, directories, log } = moduleContext;
	const { settings, options } = state;

	// Structural-only options check: log on mismatch, do not throw.
	const parsed = optionsSchema.safeParse(options.assets);
	if (!parsed.success) {
		for (const issue of parsed.error.issues) {
			log.warn('options:', `${issue.path.join('.')}, ${issue.message}`);
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
		log.warn('directories.assets is unset, registerVirtualDir must run before this plugin');
		return;
	}

	// Declared-but-never-emitted check. Baseline holds both halves of this: what
	// `settings.head` asks the browser to load, and what the build actually put
	// on disk. A `<link>` to a stylesheet that no entry point produces renders a
	// 404 on every page, on a green build, and nothing says so.
	//
	// Site-level only. Per-page head entries live in the cascade rather than in
	// settings, and walking every page to check them would cost more than the
	// class of mistake is worth.
	const declaredPaths = collectDeclaredPaths(settings.head);

	eleventyConfig.on('eleventy.after', () => {
		// The pre-pass runs dry, so nothing is on disk and every path would look
		// missing. Its log lines are gated anyway, but relying on that would make
		// this check correct by accident.
		if (process.env.BASELINE_PREPASS_ACTIVE === '1') return;

		for (const href of findMissingAssets(declaredPaths, directories.output)) {
			log.warn(
				`settings.head declares "${href}" and the build emitted no such file. ` +
					'Every page will link to a 404. Check the entry point name, or drop the declaration.'
			);
		}
	});

	// Watch common asset formats so edits trigger reloads during --serve.
	eleventyConfig.addWatchTarget(watchGlob);

	log.info('Assets pipeline registered');

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
	// No try/catch here on purpose. The processor already decides what a failure
	// means: it throws in a build and returns a comment string in serve mode.
	// Catching again would put the build back to green, which is the behaviour
	// this replaced.
	eleventyConfig.addAsyncFilter('inlineESbuild', async function (inputPath, opts = {}) {
		const js = await assetsESbuild(inputPath, opts);
		return `<script>${js}</script>`;
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
	// See inlineESbuild above: the processor owns the build-versus-serve decision.
	eleventyConfig.addAsyncFilter('inlinePostCSS', async function (inputPath) {
		const css = await assetsPostCSS(inputPath);
		return `<style>${css}</style>`;
	});
}
