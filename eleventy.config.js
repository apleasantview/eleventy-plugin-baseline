/**
 * Docs site config.
 *
 * This is the documentation site for @apleasantview/eleventy-plugin-baseline.
 * It uses the plugin it documents — the live demo is the docs themselves.
 * Site-specific additions (syntax highlighting, docs collection, alert shortcode)
 * live here; everything else comes from the plugin's config.
 */
import 'dotenv/config';

import baseline, { config as baselineConfig } from './_baseline/index.js';
import syntaxHighlight from '@11ty/eleventy-plugin-syntaxhighlight';

import settings from './src/_data/settings.js';

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default async function (eleventyConfig) {
	// --- Baseline plugin ---
	await eleventyConfig.addPlugin(
		baseline(settings, {
			verbose: true,
			multilingual: true,
			sitemap: true,
			navigator: true,
			head: {
				titleSeparator: ' | ',
				showGenerator: true
			},
			assets: {
				esbuild: {}
			}
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

	// --- Content blocks are dressed in shortcodes ---
	// Alert block: wraps content in a styled alert component (info, warning, etc.).
	eleventyConfig.addPairedNunjucksShortcode('alertBlock', function (content, alert = 'info') {
		const res = this.env.render('blocks/alert.njk', {
			content: content,
			type: alert
		});
		return res;
	});

	// Steps Block: wraps lists in a styled list component.
	eleventyConfig.addPairedNunjucksShortcode('stepsBlock', function (content, steps = 'default') {
		const res = this.env.render('blocks/step.njk', {
			content: content,
			type: steps
		});
		return res;
	});

	eleventyConfig.addPairedNunjucksShortcode('tableBlock', function (content, responsive = 'false') {
		const res = this.env.render('blocks/table.njk', {
			content: content,
			responsive: responsive
		});
		return res;
	});

	eleventyConfig.addFilter('unique', (array, key) => {
		if (!Array.isArray(array)) return [];

		if (!key) {
			return [...new Set(array)];
		}

		const seen = new Set();

		return array.filter((item) => {
			const value = item?.[key];

			if (seen.has(value)) return false;

			seen.add(value);
			return true;
		});
	});
}

// Re-export directory config from the plugin so Eleventy picks it up.
export const config = baselineConfig;
