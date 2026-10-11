/**
 * Surface barrel
 *
 * Single entry point for everything Baseline registers against Eleventy that
 * user templates can reach: filters, global functions, shortcodes.
 */

// --- Filters ---
export { markdownFilter } from '../markdown/markdownify.js';
export { relatedPostsFilter } from './filters/related-posts.js';
export { isStringFilter } from './filters/isString.js';
export { createTFilter } from './filters/t.js';

// --- Shortcodes ---
export { createImageShortcode } from './image-shortcode.js';
