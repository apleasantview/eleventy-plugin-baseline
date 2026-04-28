import { registerDateGlobal } from './date.js';

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export function registerGlobals(eleventyConfig) {
	registerDateGlobal(eleventyConfig);
}
