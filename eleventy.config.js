/**
 * Docs site config.
 *
 * This is the documentation site for @apleasantview/eleventy-plugin-baseline.
 * It uses the plugin it documents — the live demo is the docs themselves.
 * Site-specific additions (syntax highlighting, docs collection, alert shortcode)
 * live here; everything else comes from the plugin's config.
 */
import 'dotenv/config';

import baseline from './_baseline/eleventy.config.js';
import { config as _config } from './_baseline/eleventy.config.js';
import syntaxHighlight from '@11ty/eleventy-plugin-syntaxhighlight';

import i18n from './src/_data/i18n.js';

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default async function (eleventyConfig) {
	// --- Baseline plugin ---
	eleventyConfig.addPlugin(
		baseline({
			verbose: false,
			enableNavigatorTemplate: true,
			multilingual: true,
			defaultLanguage: i18n.defaultLanguage,
			languages: i18n.languages
		})
	);

	// --- Site-specific plugins ---
	eleventyConfig.addPlugin(syntaxHighlight, { preAttributes: { tabindex: 0 } });

	// --- Collections ---
	// Docs collection: all markdown under src/content/docs/, sorted by path
	// so section numbering (01.tutorial/, 02.concepts/) determines order.
	eleventyConfig.addCollection('docs', function (collectionApi) {
		const docs = collectionApi.getFilteredByGlob('src/content/docs/**/*.md');
		return docs.sort(function (a, b) {
			return a.inputPath.localeCompare(b.inputPath);
		});
	});

	// --- Shortcodes ---
	// Alert block: wraps content in a styled alert component (info, warning, etc.).
	eleventyConfig.addPairedNunjucksShortcode('alertBlock', function (text, alert = 'info') {
		const res = this.env.render('components/alerts.njk', {
			content: text,
			type: alert
		});
		return res;
	});
}

// Re-export directory config from the plugin so Eleventy picks it up.
export const config = _config;
