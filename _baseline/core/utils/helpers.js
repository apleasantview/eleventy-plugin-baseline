import { TemplatePath } from '@11ty/eleventy-utils';
import slugifyLib from 'slugify';

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
 * Resolve a subdirectory under input and output.
 * Joins inputDir/outputDir with rawDir, normalises, and adds trailing slashes.
 * @param {string} inputDir - The input directory (e.g., "./src/").
 * @param {string} outputDir - The output directory (e.g., "./dist/").
 * @param {string} rawDir - Raw subdirectory value (e.g., "assets", "static").
 * @returns {{input: string, output: string}}
 */
export function resolveSubdir(inputDir, outputDir, rawDir) {
	const joinedInput = TemplatePath.join(inputDir, rawDir || '');
	const joinedOutput = TemplatePath.join(outputDir, rawDir || '');

	return {
		input: addTrailingSlash(TemplatePath.standardizeFilePath(joinedInput)),
		output: addTrailingSlash(TemplatePath.standardizeFilePath(joinedOutput))
	};
}

/**
 * Slugify a string into a wikilink-friendly key.
 * Lowercases, strips diacritics, replaces non-alphanumerics with hyphens,
 * trims leading/trailing hyphens. Returns null for empty input.
 *
 * @param {string|null|undefined} input
 * @returns {string|null}
 */
export function slugify(input) {
	if (input == null) return null;
	const slug = slugifyLib(String(input), { lower: true, strict: true, trim: true });
	return slug || null;
}

/**
 * Normalize language input to an object map.
 * Accepts an array of language codes or an object keyed by language code.
 * Returns null if input is invalid or empty.
 *
 * @param {Object} settings - Options object containing languages.
 * @param {import('../logging.js').BaselineLogger} [logger] - Logger for dropped-entry notice.
 * @returns {Record<string, Object>|null} Normalized language map, or null.
 */
export function normalizeLanguages(settings, logger) {
	const normalizedLanguages = Array.isArray(settings.languages)
		? Object.fromEntries(
				settings.languages
					.filter((lang) => typeof lang === 'string' && lang.trim())
					.map((lang) => [lang.toLowerCase().trim(), {}])
			)
		: settings.languages && typeof settings.languages === 'object'
			? settings.languages
			: null;

	if (logger && Array.isArray(settings.languages)) {
		const normalizedCount = normalizedLanguages ? Object.keys(normalizedLanguages).length : 0;
		if (normalizedCount !== settings.languages.length) {
			logger.info('Some languages entries were invalid and were dropped.');
		}
	}
	return normalizedLanguages;
}
