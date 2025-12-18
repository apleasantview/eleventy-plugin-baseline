import { TemplatePath } from "@11ty/eleventy-utils";
import { addTrailingSlash, resolveAssetsDir, warnIfVerbose, getVerbose } from "../../../helpers.js";

const syncCacheFromDirectories = (cache, dirs, rawDir) => {
	const inputDir = TemplatePath.addLeadingDotSlash(dirs.input || "./");
	const outputDir = TemplatePath.addLeadingDotSlash(dirs.output || "./");
	const { assetsDir, assetsOutputDir } = resolveAssetsDir(inputDir, outputDir, rawDir);

	cache.input = addTrailingSlash(inputDir);
	cache.output = addTrailingSlash(outputDir);
	cache.assetsInput = assetsDir;
	cache.assetsOutput = assetsOutputDir;
};

const ensureCache = (cache, eleventyConfig, rawDir, verbose) => {
	if (cache.assetsInput) return;
	syncCacheFromDirectories(cache, eleventyConfig.dir || {}, rawDir);
	warnIfVerbose(verbose, "Fallback directory resolution");
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
 */
/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function assetsCore(eleventyConfig, options = {}) {
	const globalVerbose = getVerbose(eleventyConfig);
	const verbose = options.verbose ?? globalVerbose ?? false;
	const userKey = "assets";

	// Extract raw directory value from config (can be done early)
	const rawDir = eleventyConfig.dir?.[userKey] || userKey;

	// Cache object (raw values; normalized later by syncCacheFromDirectories)
	const cache = {
		input: eleventyConfig.dir?.input || null,
		output: eleventyConfig.dir?.output || null,
		assetsInput: eleventyConfig.dir?.assets ?? userKey ?? null,
		assetsOutput: null,
	};

	syncCacheFromDirectories(cache, eleventyConfig.dir || {}, rawDir);

	eleventyConfig.on("eleventy.directories", (directories) => {
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
			configurable: false,
		});
	});

	eleventyConfig.addGlobalData("_baseline.assets", () => {
		ensureCache(cache, eleventyConfig, rawDir, verbose);
		return {
			input: cache.assetsInput,
			output: cache.assetsOutput
		};
	});

	// Watch target — use resolved assets input dir.
	ensureCache(cache, eleventyConfig, rawDir, verbose);
	const watchGlob = TemplatePath.join(cache.assetsInput, "**/*.{css,js,svg,png,jpeg}");
	eleventyConfig.addWatchTarget(watchGlob);
}
