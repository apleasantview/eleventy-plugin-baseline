import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { langNormalization } from '../../core/utils/helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sitemap Core (Eleventy Module)
 *
 * This module is responsible for sitemap generation and sitemap-related
 * page metadata enrichment within the baseline system.
 *
 * It operates as a structural layer on top of Eleventy collections,
 * not as a standalone rendering system.
 *
 * ------------------------------------------------------------
 *
 * Responsibilities
 * ------------------------------------------------------------
 * 1. Inject computed sitemap metadata into all pages
 * 2. Register sitemap XML output templates
 * 3. Support optional multilingual sitemap partitioning
 * 4. Generate sitemap index when multilingual mode is active
 *
 * ------------------------------------------------------------
 *
 * Sitemap Data Model
 * ------------------------------------------------------------
 *
 * Each page is enriched with a computed `page.sitemap` object:
 *
 * {
 *   ignore: boolean,
 *   changefreq: string,
 *   priority: number
 * }
 *
 * A page is excluded when:
 * - data.noindex is true
 * - or noindex is inherited from upstream data cascade
 *
 * ------------------------------------------------------------
 *
 * Activation Rules
 * ------------------------------------------------------------
 *
 * Multilingual mode is enabled when:
 * - options.multilingual is true
 * - settings.defaultLanguage is defined
 * - a normalized language map exists
 *
 * Otherwise, the system falls back to single-sitemap mode.
 *
 * ------------------------------------------------------------
 *
 * Outputs
 * ------------------------------------------------------------
 *
 * Single-language mode:
 * - /sitemap.xml
 *
 * Multilingual mode:
 * - /{lang}/sitemap.xml (per language)
 * - /sitemap.xml (sitemap index)
 *
 * ------------------------------------------------------------
 *
 * Options
 * ------------------------------------------------------------
 *
 * @typedef {Object} SitemapOptions
 *
 * @property {boolean} [enableSitemapTemplate=true]
 * Controls registration of virtual sitemap templates.
 *
 * @property {boolean} [multilingual]
 * Enables multilingual sitemap generation.
 * If omitted, derived from baseline state.
 *
 * @property {string} [defaultLanguage]
 * Default language used in multilingual sitemap resolution.
 *
 * @property {Object|Array} [languages]
 * Language definitions used to partition sitemap output.
 *
 * ------------------------------------------------------------
 *
 * Module Context
 * ------------------------------------------------------------
 *
 * @typedef {Object} SitemapContext
 *
 * Shared module boundary contract.
 *
 * @property {Object} state
 * Resolved baseline state (settings + options).
 *
 * @property {Object} log
 * Scoped logger instance for module diagnostics.
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
				languages: moduleOptions.languages,
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
}
