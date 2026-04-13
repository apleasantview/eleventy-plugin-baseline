import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * eleventy-plugin-sitemap-core
 *
 * Generates XML sitemaps. Adds a computed page.sitemap object to every page
 * (with ignore/changefreq/priority), then registers virtual templates for
 * the sitemap XML. In multilingual mode, produces per-language sitemaps plus
 * a sitemap index. Pages opt out via noindex in data.
 *
 * No cross-module dependencies. Receives multilingual config (languages,
 * multilingual flag) via options at registration time — does not import
 * from multilang-core.
 *
 * Options:
 *  - enableSitemapTemplate (boolean, default true): register virtual sitemap templates.
 *  - multilingual (boolean): force multilingual mode. Auto-detected from languages if omitted.
 *  - languages (array|object): language codes. Determines per-language sitemap generation.
 */
/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function sitemapCore(eleventyConfig, options = {}) {
	const userOptions = {
		enableSitemapTemplate: options.enableSitemapTemplate ?? true,
		multilingual: options.multilingual,
		languages: options.languages
	};

	// Computed sitemap data: every page gets a page.sitemap object.
	// Pages set noindex in frontmatter or site data to be excluded.
	eleventyConfig.addGlobalData('eleventyComputed.page.sitemap', () => {
		return (data) => ({
			ignore: data.noindex ?? data.page?.noindex ?? data.site?.noindex ?? false,
			changefreq: '',
			priority: -1
		});
	});

	// --- Virtual sitemap templates ---
	// Read template sources synchronously (same constraint as navigator-core).
	// In multilingual mode: one sitemap per language + a sitemap index.
	// In single-language mode: one flat sitemap at /sitemap.xml.
	if (userOptions.enableSitemapTemplate) {
		const templatePath = path.join(__dirname, '../templates/sitemap-core.html');
		const indexTemplatePath = path.join(__dirname, '../templates/sitemap-index.html');
		const baseContent = fs.readFileSync(templatePath, 'utf-8');
		const indexContent = fs.readFileSync(indexTemplatePath, 'utf-8');

		const languages = userOptions.languages || {};
		const langKeys = Array.isArray(languages) ? languages : Object.keys(languages);
		const multilingual = typeof userOptions.multilingual === 'boolean' ? userOptions.multilingual : langKeys.length > 1;

		if (multilingual && langKeys.length > 1) {
			for (const lang of langKeys) {
				eleventyConfig.addTemplate(`_baseline/sitemap-core-${lang}.html`, baseContent, {
					permalink: `${lang}/sitemap.xml`,
					title: '',
					description: '',
					layout: null,
					eleventyExcludeFromCollections: true,
					isMultilingual: multilingual,
					sitemapLang: lang
				});
			}

			eleventyConfig.addTemplate('_baseline/sitemap-index.html', indexContent, {
				permalink: '/sitemap.xml',
				title: '',
				description: '',
				layout: null,
				eleventyExcludeFromCollections: true,
				isMultilingual: multilingual
			});
		} else {
			eleventyConfig.addTemplate('_baseline/sitemap-core.html', baseContent, {
				permalink: '/sitemap.xml',
				title: '',
				description: '',
				layout: null,
				eleventyExcludeFromCollections: true
			});
		}
	}
}
