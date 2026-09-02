/**
 * Register filters and shortcodes without overwriting the project's own.
 *
 * `addFilter` and `addShortcode` overwrite by name, and Eleventy's warning for
 * it goes to `debug`, so a project losing its own `image` to Baseline's never
 * hears about it. The project wins instead, and the names it kept are reported.
 *
 * Reads `eleventyConfig.universal`, which is not documented API. If it moves,
 * nothing is taken and every registration goes through as before.
 *
 * @param {Object} eleventyConfig - Eleventy config object.
 * @returns {{ filter: Function, shortcode: Function, skipped: string[] }}
 */
export function createRegistrar(eleventyConfig) {
	const skipped = [];

	const claim = (registry, name) => {
		if (!registry?.[name]) return true;
		skipped.push(name);
		return false;
	};

	return {
		filter(name, callback) {
			if (claim(eleventyConfig?.universal?.filters, name)) eleventyConfig.addFilter(name, callback);
		},
		shortcode(name, callback) {
			if (claim(eleventyConfig?.universal?.shortcodes, name)) eleventyConfig.addShortcode(name, callback);
		},
		skipped
	};
}
