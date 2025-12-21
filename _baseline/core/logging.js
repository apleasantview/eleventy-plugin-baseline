/**
 * Gets verbose flag from Eleventy global data
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * @returns {boolean}
 */
export function getVerbose(eleventyConfig) {
	const baselineData = eleventyConfig.globalData?._baseline;
	return !!baselineData?.verbose;
}

/**
 * Logs a message if verbose mode is enabled
 * @param {boolean} verbose - Whether verbose logging is enabled
 * @param {string} message - Message to log
 * @param {...any} args - Additional arguments
 */
export function logIfVerbose(verbose, message, ...args) {
	if (verbose) {
		console.log(`[eleventy-plugin-baseline] INFO ${message}`, ...args);
	}
}

/**
 * Logs a warning if verbose mode is enabled
 * @param {boolean} verbose - Whether verbose logging is enabled
 * @param {string} message - Warning message
 */
export function warnIfVerbose(verbose, message) {
	if (verbose) {
		console.warn(`[eleventy-plugin-baseline] WARN ${message}`);
	}
}
