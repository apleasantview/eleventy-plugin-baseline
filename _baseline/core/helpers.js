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

/**
 * Normalize language input to an object map.
 * Accepts an array of language codes or an object keyed by language code.
 * Returns null if input is invalid or empty.
 *
 * @param {Object} userOptions - Options object containing languages and verbose flag.
 * @returns {Record<string, Object>|null} Normalized language map, or null.
 */
export function langNormalization(userOptions) {
	const normalizedLanguages = Array.isArray(userOptions.languages)
		? Object.fromEntries(
				userOptions.languages
					.filter((lang) => typeof lang === 'string' && lang.trim())
					.map((lang) => [lang.toLowerCase().trim(), {}])
			)
		: userOptions.languages && typeof userOptions.languages === 'object'
			? userOptions.languages
			: null;

	if (userOptions.verbose && Array.isArray(userOptions.languages)) {
		const normalizedCount = normalizedLanguages ? Object.keys(normalizedLanguages).length : 0;
		if (normalizedCount !== userOptions.languages.length) {
			console.warn('[baseline] Some languages entries were invalid and were dropped.');
		}
	}
	return normalizedLanguages;
}

