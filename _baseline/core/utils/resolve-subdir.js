import { TemplatePath } from '@11ty/eleventy-utils';
import { addTrailingSlash } from './add-trailing-slash.js';

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
