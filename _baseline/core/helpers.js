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
 * Resolves the assets directory paths from config.
 * Joins inputDir/outputDir with rawDir, normalizes, and adds trailing slashes.
 * @param {string} inputDir - The input directory (e.g., "./src/").
 * @param {string} outputDir - The output directory (e.g., "./dist/").
 * @param {string} rawDir - Raw directory value from config (e.g., "assets").
 * @returns {{assetsDir: string, assetsOutputDir: string}}
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

