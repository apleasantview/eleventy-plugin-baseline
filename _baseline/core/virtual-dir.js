import { ensureDotSlashDir } from './utils/ensure-dot-slash-dir.js';
import { resolveSubdir } from './utils/resolve-subdir.js';
import { createLogger } from './logging.js';
import { getScope, addScopeListener, setEntry } from './registry.js';

const SCOPE_NAME = 'core:virtual-dir';
const LOG_NAME = 'virtual-dir';

/**
 * Virtual directories (runtime substrate)
 *
 * Synthesises extra keys on eleventyConfig.directories (e.g. `assets`,
 * `public`) that Eleventy itself won't accept, and keeps them in sync once
 * Eleventy finalises its real directory map.
 *
 * Architecture layer:
 *   runtime substrate
 *
 * System role:
 *   Adds virtual dir keys consumed by modules (assets reads
 *   `directories.assets`) and by the composition root (passthrough copy from
 *   `directories.public`).
 *
 * Lifecycle:
 *   build-time → synthesise key, pre-populate cache from eleventyConfig.dir
 *   build-time → on `eleventy.directories`, refresh the cache to final paths
 *
 * Why this exists:
 *   Eleventy's ProjectDirectories.setViaConfigObject() only honours input,
 *   output, data, includes, and layouts. Extra `dir.*` keys are silently
 *   ignored, and the `eleventy.directories` event exposes only the same set.
 *   Synthesis fills the gap so consumers can read additional dirs the same
 *   way they read the real ones.
 *
 * Scope:
 *   Owns synthesis of extra `eleventyConfig.directories` keys, the live
 *   cache, and a single shared listener for sync.
 *   Does not own passthrough copy or watch wiring (composition root and
 *   modules own those).
 *
 * Data flow:
 *   { name, outputDir } → eleventyConfig.directories[name] getter →
 *   live { input, output } cache → consumers
 */

/**
 * Register a virtual directory on eleventyConfig.directories.
 *
 * @param {import('@11ty/eleventy').UserConfig} eleventyConfig
 * @param {Object} options
 * @param {string} options.key - Key to synthesise (e.g. 'assets', 'public').
 * @param {string} [options.outputDir] - Override the output subdirectory. Defaults
 *   to the raw dir value (symmetric with input). Pass `''` to resolve to the
 *   output root (used by `public`, which copies to `/`).
 * @returns {{input: string, output: string}} Live cache; properties refresh when
 *   eleventy.directories fires. Safe to read at plugin-init time.
 */
export function registerVirtualDir(eleventyConfig, { key, outputDir } = {}) {
	if (!key) {
		throw new Error('[baseline/virtual-dir] `name` is required');
	}

	const log = createLogger(LOG_NAME);
	const scope = getScope(eleventyConfig, SCOPE_NAME);
	const rawDir = eleventyConfig.dir?.[key] || key;
	const rawOutputDir = outputDir ?? rawDir;
	const cache = { input: null, output: null };

	// Pre-populate from eleventyConfig.dir so synchronous readers at plugin-init
	// time (watch globs, ignores, compile-guard prefixes) see a valid path.
	syncCache(cache, eleventyConfig.dir || {}, rawDir, rawOutputDir);

	setEntry(scope, key, { rawDir, rawOutputDir, cache });

	// Define the virtual key once. The getter reads the live cache, which the
	// shared listener below refreshes when Eleventy emits its final directories.
	const existing = Object.getOwnPropertyDescriptor(eleventyConfig.directories, key);
	if (existing && existing.configurable === false) {
		log.info(`directories.${key} already defined, skipping`);
	} else {
		Object.defineProperty(eleventyConfig.directories, key, {
			get() {
				return cache.input;
			},
			enumerable: true,
			configurable: false
		});
	}

	// One listener services all virtual dirs registered on this config.
	// addScopeListener dedupes on ('eleventy.directories', 'sync'), so
	// subsequent registerVirtualDir calls don't stack handlers.
	addScopeListener(eleventyConfig, SCOPE_NAME, 'eleventy.directories', 'sync', (scope, dirs) => {
		for (const entry of scope.values.values()) {
			syncCache(entry.cache, dirs, entry.rawDir, entry.rawOutputDir);
		}
	});

	log.info('Virtual directories mounted');

	return cache;
}

function syncCache(cache, dirs, rawDir, rawOutputDir) {
	const inputDir = ensureDotSlashDir(dirs.input);
	const outputDir = ensureDotSlashDir(dirs.output);

	// resolveSubdir symmetrically resolves against input and output; call twice
	// so input and output subdirs can differ (e.g. `public` copies to root).
	cache.input = resolveSubdir(inputDir, outputDir, rawDir).input;
	cache.output = resolveSubdir(inputDir, outputDir, rawOutputDir).output;
}
