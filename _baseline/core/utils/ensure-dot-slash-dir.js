import { TemplatePath } from '@11ty/eleventy-utils';

/**
 * Normalise a directory path to a `./`-prefixed form, defaulting empty/missing
 * input to the current directory. Thin wrapper over
 * `TemplatePath.addLeadingDotSlash` that bakes in the empty-string fallback.
 *
 * @param {string | undefined} dir
 * @returns {string}
 */
export function ensureDotSlashDir(dir) {
	return TemplatePath.addLeadingDotSlash(dir || './');
}
