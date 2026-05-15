/**
 * Surface barrel
 *
 * Single entry point for everything Baseline registers against Eleventy that
 * user templates can reach: filters, global functions, shortcodes.
 */

import { registerDateGlobal } from './global-date-function.js';

// --- Filters ---
export { markdownFilter } from '../markdown/markdownify.js';
export { relatedPostsFilter } from './filters/related-posts.js';
export { isStringFilter } from './filters/isString.js';

// --- Shortcodes ---
export { imageShortcode } from './image-shortcode.js';

// --- Global functions (aggregator) ---
/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export function registerGlobals(eleventyConfig) {
	registerDateGlobal(eleventyConfig);
}
