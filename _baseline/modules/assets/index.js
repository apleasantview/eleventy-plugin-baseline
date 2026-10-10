import { TemplatePath } from '@11ty/eleventy-utils';

import { getScope } from '../../core/registry.js';
import { renderAttributes } from '../../core/utils/render-attributes.js';
import { optionsSchema } from './schema.js';
import assetsESbuild from './processors/esbuild-process.js';
import assetsPostCSS from './processors/postcss-process.js';
import { collectDeclaredPaths, findMissingAssets } from './utils/declared-assets.js';
import { createAssetIndex } from './asset-index.js';

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
const SCOPE_NAME = 'module:assets';

export function assetsCore(eleventyConfig, moduleContext) {
	const { state, directories, runtime, isPrepass, log } = moduleContext;
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

	// Entry points ride with their processor. Stripped from what esbuild is
	// handed: the processor sets its own, one file per call.
	const { entryPoints: declaredJsEntries, ...esbuildOptions } = options.assets.esbuild ?? {};
	const { entryPoints: declaredCssEntries } = options.assets.postcss ?? {};

	// Default on: forgetting it costs correct caching, never a wrong file. Head
	// resolves what `settings.head` declares, so a site changes nothing.
	const fingerprint = options.assets.fingerprint !== false;
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
		if (isPrepass) return;

		for (const href of findMissingAssets(declaredPaths, directories.output, assetIndex.resolve)) {
			log.warn(
				`settings.head declares "${href}" and the build emitted no such file. ` +
					'Every page will link to a 404. Check the entry point name, or drop the declaration.'
			);
		}
	});

	// --- Asset index ---
	// Rebuilt whole on every cycle, so its lifetime is one build and there is no
	// invalidation to get wrong. Compiles only in a build: dev keys the index so
	// lookups still resolve, and leaves the per-file compile where it is.
	const assetIndex = createAssetIndex({
		inputDirectory,
		publicPrefix: `/${assetsDirectory.replace(inputDirectory, '')}`,
		log,
		sources: [
			{
				directory: cssDirectory,
				basename: 'index.css',
				entryPoints: declaredCssEntries,
				compile: (inputPath) => assetsPostCSS(inputPath)
			},
			{
				directory: jsDirectory,
				basename: 'index.js',
				entryPoints: declaredJsEntries,
				compile: (inputPath) => assetsESbuild(inputPath, esbuildOptions)
			}
		]
	});

	getScope(eleventyConfig, SCOPE_NAME).values.set('index', assetIndex);

	// Head resolves a declared href through this at transform-time, where the
	// data cascade is out of reach.
	runtime?.assetIndex?.set(assetIndex);

	// Read-only, for what a URL cannot carry (`integrity` above all). A function,
	// so a serve-mode rebuild re-resolves it.
	eleventyConfig.addGlobalData('_assets', () => assetIndex.manifest());

	eleventyConfig.on('eleventy.before', async () => {
		// The pre-pass is handed `ignore: [directories.assets]`, so it compiles no
		// assets and has nothing to index.
		if (isPrepass) return;

		const isBuild = process.env.ELEVENTY_RUN_MODE === 'build';

		await assetIndex.build({ compile: isBuild, fingerprint: isBuild && fingerprint });
	});

	// A function rather than a string: Eleventy renders a string permalink through
	// this very engine, which would hand back the compiled stylesheet as the path.
	function assetPermalink(inputPath) {
		const entry = assetIndex.getByInput(inputPath);
		if (!entry || entry.url === entry.key) return;
		return { permalink: () => entry.url };
	}

	// For a path written in a layout rather than declared in `settings.head`,
	// which head resolves on the author's behalf.
	eleventyConfig.addFilter('asset', (href) => assetIndex.resolve(href));

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
		getData: assetPermalink,
		compileOptions: {
			permalink: true,
			cache: true
		},
		// Compile guard: the index decides what an entry is, so a declared
		// `entryPoints` list works whatever the files are called. Returning
		// undefined skips the file without error.
		compile: async function (_inputContent, inputPath) {
			if (inputPath.includes('11tydata.js') || !assetIndex.isEntry(inputPath)) {
				return;
			}

			// The index compiled this at `eleventy.before`, so reuse it rather
			// than running esbuild a second time. Falls through in dev, where
			// the index is keyed but nothing is compiled.
			return async () => assetIndex.getByInput(inputPath)?.content ?? assetsESbuild(inputPath, esbuildOptions);
		}
	});

	// Inline filter: bundle a JS file and wrap in <script> tags.
	// Accepts per-call esbuild options (merged with defaults in process.js) plus
	// `attributes` for the tag itself.
	// Eleventy's addAsyncFilter handles the Nunjucks callback bridge,
	// so this is a plain async function.
	// No try/catch here on purpose. The processor already decides what a failure
	// means: it throws in a build and returns a comment string in serve mode.
	// Catching again would put the build back to green, which is the behaviour
	// this replaced.
	// The tag is the filter's to emit, so the attributes on it are too. A caller
	// who has to unwrap and re-wrap to add `nonce` has thrown away the one thing
	// only this call site holds: the tag and the bundle it hashes over, together.
	eleventyConfig.addAsyncFilter('inlineESbuild', async function (inputPath, opts = {}) {
		const { attributes, ...esbuildOpts } = opts;
		const js = await assetsESbuild(inputPath, esbuildOpts);
		return `<script${renderAttributes(attributes)}>${js}</script>`;
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
		getData: assetPermalink,
		compileOptions: {
			permalink: true,
			cache: true
		},
		// Compile guard: see the js one above, the index is the authority.
		compile: async function (_inputContent, inputPath) {
			if (!assetIndex.isEntry(inputPath)) {
				return;
			}

			// See the js guard above: the index already holds this in a build.
			return async () => assetIndex.getByInput(inputPath)?.content ?? assetsPostCSS(inputPath);
		}
	});

	// Inline filter: process a CSS file through PostCSS and wrap in <style> tags.
	// Eleventy's addAsyncFilter handles the Nunjucks callback bridge,
	// so this is a plain async function.
	// See inlineESbuild above: the processor owns the build-versus-serve decision,
	// and the tag's attributes belong to whoever emits the tag. PostCSS takes no
	// per-call options, so `attributes` is the whole bag here.
	eleventyConfig.addAsyncFilter('inlinePostCSS', async function (inputPath, opts = {}) {
		const css = await assetsPostCSS(inputPath);
		return `<style${renderAttributes(opts.attributes)}>${css}</style>`;
	});
}
