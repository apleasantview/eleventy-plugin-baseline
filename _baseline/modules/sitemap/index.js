import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeLanguages } from '../../core/utils/helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sitemap (module)
 *
 * Sitemap generation and per-page sitemap metadata. Layers on Eleventy
 * collections rather than rendering independently. In multilingual mode it
 * partitions per-language sitemaps and emits a sitemap index; otherwise it
 * emits a single flat sitemap.
 *
 * Architecture layer:
 *   module
 *
 * System role:
 *   Reads the same normalised language map as multilang (via
 *   core/utils/helpers.js) and emits virtual templates that Eleventy
 *   renders to XML. Pages opt out via `noindex` in the cascade.
 *
 * Lifecycle:
 *   build-time   → register virtual sitemap templates (single, per-lang,
 *                  or index)
 *   cascade-time → eleventyComputed `page.sitemap` resolves ignore /
 *                  changefreq / priority on each page
 *
 * Why this exists:
 *   Eleventy has no built-in sitemap. Multilingual sites also need
 *   partitioning plus an index, which only makes sense once language config
 *   is normalised the same way multilang sees it.
 *
 * Scope:
 *   Owns computed page.sitemap and the virtual sitemap templates
 *   (single-language /sitemap.xml, or per-lang /{lang}/sitemap.xml plus a
 *   /sitemap.xml index).
 *   Does not own language normalisation (core/utils/helpers.js) or noindex
 *   propagation through the cascade.
 *
 * Data flow:
 *   settings.languages + page data → computed page.sitemap + virtual
 *   templates → /sitemap.xml or per-language + index
 *
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * @param {Object} moduleContext
 */
export default function sitemapCore(eleventyConfig, moduleContext) {
	const { state, log } = moduleContext;
	const { settings, options } = state;

	// --- Language normalization ---
	// Accept languages as array or object; normalize to object map.
	// Drives collection building, locale data, and sitemap-core language config.
	const normalizeLanguageCode = (lang) => (lang || '').toLowerCase().trim();
	const defaultLanguage = normalizeLanguageCode(settings.defaultLanguage);
	const languages = normalizeLanguages(settings, log);
	const hasLanguages = languages && Object.keys(languages).length > 0;
	const isMultilingual = options.multilang === true && defaultLanguage && hasLanguages;

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
	// Activation gate lives in the composition root via features.sitemap;
	// the module is only registered when enabled.
	const templatePath = path.join(__dirname, './templates/sitemap-core.html');
	const indexTemplatePath = path.join(__dirname, './templates/sitemap-index.html');
	const baseContent = fs.readFileSync(templatePath, 'utf-8');
	const indexContent = fs.readFileSync(indexTemplatePath, 'utf-8');

	const langKeys = Object.keys(languages || {});
	const multilingual = isMultilingual;

	if (multilingual && langKeys.length > 1) {
		for (const lang of langKeys) {
			eleventyConfig.addTemplate(`_baseline/sitemap-core-${lang}.html`, baseContent, {
				permalink: `${lang}/sitemap.xml`,
				title: '',
				description: '',
				layout: null,
				eleventyExcludeFromCollections: true,
				isMultilingual: multilingual,
				sitemapLang: lang,
				_internal: true
			});
		}

		eleventyConfig.addTemplate('_baseline/sitemap-index.html', indexContent, {
			permalink: '/sitemap.xml',
			title: '',
			description: '',
			layout: null,
			eleventyExcludeFromCollections: true,
			isMultilingual: multilingual,
			languages: languages,
			_internal: true
		});
	} else {
		eleventyConfig.addTemplate('_baseline/sitemap-core.html', baseContent, {
			permalink: '/sitemap.xml',
			title: '',
			description: '',
			layout: null,
			eleventyExcludeFromCollections: true,
			_internal: true
		});
	}
}
