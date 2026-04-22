import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { langNormalization } from '../../core/helpers.js';

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
 * Shares the langNormalization helper with multilang-core via core/helpers.js.
 *
 * Options:
 *  - enableSitemapTemplate (boolean, default true): register virtual sitemap templates.
 *  - multilingual (boolean): enable multilingual mode. Auto-detected from languages if omitted.
 *  - defaultLanguage (string): default language code. Required for multilingual mode.
 *  - languages (array|object): language codes. Determines per-language sitemap generation.
 */
/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function sitemapCore(eleventyConfig, moduleContext) {
	const { state, log } = moduleContext;
	const settings = state.settings;
	const options = state.options;
	const languages = langNormalization(settings, log);
	const hasLanguages = languages && Object.keys(languages).length > 0;
	const isMultilingual = options.multilingual === true && settings.defaultLanguage && hasLanguages;

	const moduleOptions = {
		enableSitemapTemplate: options.enableSitemapTemplate ?? true,
		multilingual: isMultilingual,
		defaultLanguage: settings.defaultLanguage,
		languages: languages
	};

	// Computed sitemap data: every page gets a page.sitemap object.
	// Pages set noindex in frontmatter or site data to be excluded.
	eleventyConfig.addGlobalData('eleventyComputed.page.sitemap', () => {
		return (data) => ({
			ignore: data.noindex ?? data.page?.noindex ?? data.settings?.noindex ?? false,
			changefreq: '',
			priority: -1
		});
	});

	// --- Virtual sitemap templates ---
	// Read template sources synchronously (same constraint as navigator-core).
	// In multilingual mode: one sitemap per language + a sitemap index.
	// In single-language mode: one flat sitemap at /sitemap.xml.
	if (moduleOptions.enableSitemapTemplate) {
		const templatePath = path.join(__dirname, './templates/sitemap-core.html');
		const indexTemplatePath = path.join(__dirname, './templates/sitemap-index.html');
		const baseContent = fs.readFileSync(templatePath, 'utf-8');
		const indexContent = fs.readFileSync(indexTemplatePath, 'utf-8');

		const langKeys = Object.keys(moduleOptions.languages || {});
		const multilingual = moduleOptions.multilingual;

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
				isMultilingual: multilingual,
				languages: moduleOptions.languages
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
