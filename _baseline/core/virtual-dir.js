import { TemplatePath } from '@11ty/eleventy-utils';
import { resolveSubdir } from './utils/helpers.js';
import { createLogger } from './logging.js';
import { getScope, addScopeListener, setEntry } from './registry.js';

// Eleventy's ProjectDirectories.setViaConfigObject() only honours input,
// output, data, includes, and layouts; extra dir.* keys are silently ignored,
// and the eleventy.directories event exposes only those same keys. This helper
// synthesises additional virtual dir keys on eleventyConfig.directories, keeps
// them in sync when Eleventy finalises its directories, and optionally
// publishes the resolved paths as global data.

const SCOPE_NAME = 'core/virtual-dir';

/**
 * Register a virtual directory on eleventyConfig.directories.
 *
 * @param {import('@11ty/eleventy').UserConfig} eleventyConfig
 * @param {Object} options
 * @param {string} options.name - Key to synthesise (e.g. 'assets', 'public').
 * @param {string} [options.globalDataKey] - Dot-path for addGlobalData. Omit to skip.
 * @param {string} [options.outputDir] - Override the output subdirectory. Defaults
 *   to the raw dir value (symmetric with input). Pass `''` to resolve to the
 *   output root (used by `public`, which copies to `/`).
 * @returns {{input: string, output: string}} Live cache; properties refresh when
 *   eleventy.directories fires. Safe to read at plugin-init time.
 */
export function registerVirtualDir(eleventyConfig, { name, globalDataKey, outputDir } = {}) {
	if (!name) {
		throw new Error('registerVirtualDir: `name` is required');
	}

	const log = createLogger(SCOPE_NAME);
	const scope = getScope(eleventyConfig, SCOPE_NAME);
	const rawDir = eleventyConfig.dir?.[name] || name;
	const rawOutputDir = outputDir ?? rawDir;
	const cache = { input: null, output: null };

	// Pre-populate from eleventyConfig.dir so synchronous readers at plugin-init
	// time (watch globs, ignores, compile-guard prefixes) see a valid path.
	syncCache(cache, eleventyConfig.dir || {}, rawDir, rawOutputDir);

	setEntry(scope, name, { rawDir, rawOutputDir, cache });

	// Define the virtual key once. The getter reads the live cache, which the
	// shared listener below refreshes when Eleventy emits its final directories.
	const existing = Object.getOwnPropertyDescriptor(eleventyConfig.directories, name);
	if (existing && existing.configurable === false) {
		log.info(`directories[${name}] already defined; skipping`);
	} else {
		Object.defineProperty(eleventyConfig.directories, name, {
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

	// if (globalDataKey) {
	// 	eleventyConfig.addGlobalData(globalDataKey, () => ({
	// 		input: cache.input,
	// 		output: cache.output
	// 	}));
	// }

	if (globalDataKey) {
		eleventyConfig.addGlobalData(globalDataKey, {});
	}

	return cache;
}

function syncCache(cache, dirs, rawDir, rawOutputDir) {
	const inputDir = TemplatePath.addLeadingDotSlash(dirs.input || './');
	const outputDir = TemplatePath.addLeadingDotSlash(dirs.output || './');

	// resolveSubdir symmetrically resolves against input and output; call twice
	// so input and output subdirs can differ (e.g. `public` copies to root).
	cache.input = resolveSubdir(inputDir, outputDir, rawDir).input;
	cache.output = resolveSubdir(inputDir, outputDir, rawOutputDir).output;
}
