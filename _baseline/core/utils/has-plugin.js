/**
 * Test whether any of several plugin identities is registered.
 *
 * Eleventy matches on `eleventyPackage` or `Function.name`, and neither
 * follows an export alias: eleventy-img ships `eleventyImageTransformPlugin`
 * but declares `imageTransformPlugin`. Passing both names survives that.
 *
 * @param {Object} eleventyConfig - Eleventy config object.
 * @param {string[]} names - Identities to try, any one of which counts.
 * @returns {boolean} True when at least one is registered.
 */
export function hasAnyPlugin(eleventyConfig, names) {
	if (typeof eleventyConfig?.hasPlugin !== 'function') return false;
	return (names ?? []).some((name) => eleventyConfig.hasPlugin(name) === true);
}
