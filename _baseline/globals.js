import { registerDateGlobal } from "./globals/date.js";

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function registerGlobals(eleventyConfig) {
	registerDateGlobal(eleventyConfig);
}
