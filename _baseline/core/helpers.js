import path from 'node:path';
import { TemplatePath } from '@11ty/eleventy-utils';

/**
 * Helper function to add trailing slash to a path
 * @param {string} path
 * @returns {string}
 */
export function addTrailingSlash(path) {
	if (path.slice(-1) === '/') {
		return path;
	}
	return path + '/';
}

/**
 * Resolves the assets directory path from config
 * Follows Eleventy's pattern: join inputDir + rawDir, then normalize and add trailing slash
 * @param {string} inputDir - The input directory (e.g., "./src/")
 * @param {string} rawDir - Raw directory value from config (e.g., "assets")
 * @returns {{assetsDir: string, assetsDirRelative: string}}
 */
export function resolveAssetsDir(inputDir, outputDir, rawDir) {
	// Join input/output with assets subdir and normalize
	const joinedInput = TemplatePath.join(inputDir, rawDir || '');
	const joinedOutput = TemplatePath.join(outputDir, rawDir || '');

	const assetsDir = addTrailingSlash(TemplatePath.standardizeFilePath(joinedInput));
	const assetsOutputDir = addTrailingSlash(TemplatePath.standardizeFilePath(joinedOutput));

	return {
		assetsDir,
		assetsOutputDir
	};
}

/**
 * Builds glob patterns for fast-glob (absolute paths)
 * @param {string[]} patterns - User-provided patterns
 * @param {string} assetsDir - Assets directory (relative, e.g., "./src/assets/")
 * @returns {string[]} Absolute glob patterns
 */
export function buildGlobPatterns(patterns, assetsDir) {
	const assetsDirAbsolute = TemplatePath.absolutePath(TemplatePath.stripLeadingDotSlash(assetsDir));

	return patterns.map((pattern) => {
		const normalized = TemplatePath.standardizeFilePath(pattern);
		return normalized.startsWith('/') || path.isAbsolute(normalized)
			? normalized
			: TemplatePath.join(assetsDirAbsolute, normalized);
	});
}

/**
 * Extracts file metadata from a file path
 * @param {string} filePath - Normalized file path
 * @returns {{basename: string, fileSlug: string, inputFileExtension: string}}
 */
export function extractFileMetadata(filePath) {
	const ext = path.extname(filePath); // Returns extension with dot (e.g., ".css") or ""
	const inputFileExtension = ext && ext.length > 0 ? ext.slice(1) : '';
	const basename = TemplatePath.getLastPathSegment(filePath, false);
	const fileSlug = ext ? basename.slice(0, -ext.length) : basename;

	return { basename, fileSlug, inputFileExtension };
}

/**
 * Creates a collection item from a relative file path
 * @param {string} inputPath - Relative path from project root (e.g., "./src/assets/css/index.css")
 * @param {string} inputDir - Input directory (e.g., "./src/")
 * @param {string} outputDir - Output directory (e.g., "./dist/")
 * @param {string} assetsDirRelative - Assets directory relative to input (e.g., "assets")
 * @param {string} passthroughOutput - Output path for passthrough
 * @param {boolean} passthrough - Whether passthrough is enabled
 * @returns {object} Collection item
 */
export function createCollectionItem(
	inputPath,
	inputDir,
	outputDir,
	assetsDirRelative,
	passthroughOutput,
	passthrough
) {
	const { basename, fileSlug, inputFileExtension } = extractFileMetadata(inputPath);

	// Get path relative to input directory
	// e.g., inputPath = "./src/assets/css/index.css", inputDir = "./src/"
	// relToInput = "assets/css/index.css"
	const relToInput = TemplatePath.stripLeadingSubPath(inputPath, TemplatePath.addLeadingDotSlash(inputDir));

	// outputPath: prepend output directory (with leading ./)
	// e.g., relToInput = "assets/css/index.css", outputDir = "./dist/"
	// outputPath = "./dist/assets/css/index.css"
	const outputPath = TemplatePath.addLeadingDotSlash(
		TemplatePath.normalize(TemplatePath.join(TemplatePath.addLeadingDotSlash(outputDir), relToInput))
	);

	// relToAssets: path relative to assets directory for URL generation
	// e.g., inputPath = "./src/assets/css/index.css", assetsDirRelative = "assets"
	// relToAssets = "css/index.css"
	const assetsDirPath = TemplatePath.addLeadingDotSlash(TemplatePath.join(inputDir, assetsDirRelative));
	const relToAssets = TemplatePath.stripLeadingSubPath(inputPath, assetsDirPath);

	const url = passthrough ? TemplatePath.join(passthroughOutput, relToAssets).replace(/\/$/, '') : undefined;

	// filePathStem: path relative to input without extension, with leading slash
	// e.g., relToInput = "assets/css/index.css"
	// filePathStem = "/assets/css/index"
	const filePathStem =
		'/' +
		(inputFileExtension
			? relToInput.slice(0, -inputFileExtension.length - 1) // Remove extension and dot
			: relToInput);

	return {
		inputPath,
		outputPath,
		basename,
		fileSlug,
		inputFileExtension,
		filePathStem,
		dir: TemplatePath.getDirFromFilePath(inputPath),
		url
	};
}
