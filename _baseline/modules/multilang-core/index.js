import { I18nPlugin } from '@11ty/eleventy';
import { DeepCopy } from '@11ty/eleventy-utils';
import { langNormalization } from '../../core/utils/helpers.js';
import i18nTranslationsFor from './filters/i18n-translations-for.js';
import i18nTranslationIn from './filters/i18n-translation-in.js';
import i18nDefaultTranslation from './filters/i18n-default-translation.js';

/**
 * Multilang Core (Eleventy Module)
 *
 * This module provides language infrastructure for multilingual sites.
 *
 * It normalizes language configuration, builds translation relationships
 * across pages, and exposes filters for cross-language lookups.
 *
 * It also integrates with Eleventy’s I18nPlugin for locale-aware routing.
 *
 * ------------------------------------------------------------
 *
 * Responsibilities
 * ------------------------------------------------------------
 * 1. Normalize language configuration (settings.languages)
 * 2. Validate and resolve page-level language metadata
 * 3. Build translation collections (map + flat list)
 * 4. Attach computed locale data to every page
 * 5. Register relational i18n filters for templates
 *
 * ------------------------------------------------------------
 *
 * Language Model
 * ------------------------------------------------------------
 *
 * The module operates on two core concepts:
 *
 * - language
 *   → resolved per-page language code
 *
 * - translationKey
 *   → shared identifier linking translated pages
 *
 * Each page is mapped as:
 * translationKey → lang → page metadata
 *
 * ------------------------------------------------------------
 *
 * Activation Rules
 * ------------------------------------------------------------
 *
 * The module is conditionally active.
 *
 * It requires:
 * - options.multilingual === true
 * - settings.defaultLanguage
 * - a valid languages configuration
 *
 * If any of these are missing, the module exits early.
 *
 * ------------------------------------------------------------
 *
 * Outputs
 * ------------------------------------------------------------
 *
 * Global computed data:
 * - page.locale
 *   → { translationKey, lang, isDefaultLang }
 *
 * Collections:
 * - translationsMap
 *   → { [translationKey]: { [lang]: pageMeta } }
 *
 * - translations
 *   → flat list of localized pages with locale data
 *
 * Filters:
 * - i18nTranslationsFor
 * - i18nTranslationIn
 * - i18nDefaultTranslation
 *
 * ------------------------------------------------------------
 *
 * Integration
 * ------------------------------------------------------------
 *
 * Wraps Eleventy’s I18nPlugin to provide:
 * - locale-aware URL resolution
 * - fallback handling for missing translations
 *
 * Language normalization is shared with other modules
 * (e.g. sitemap-core) via core/helpers.js.
 *
 * ------------------------------------------------------------
 *
 * Options
 * ------------------------------------------------------------
 *
 * @typedef {Object} MultilangOptions
 *
 * @property {boolean} [multilingual]
 * Enables multilingual mode.
 *
 * @property {string} [defaultLanguage]
 * Default language code.
 *
 * @property {Record<string, unknown>|string[]} [languages]
 * Supported language definitions.
 *
 * @property {boolean} [verbose]
 * Enables logging for invalid or unknown language codes.
 *
 * ------------------------------------------------------------
 *
 * Module Context
 * ------------------------------------------------------------
 *
 * @typedef {Object} moduleContext
 *
 * Shared module boundary contract.
 *
 * @property {Object} state
 * Resolved baseline state (settings + options).
 *
 * @property {Object} log
 * Scoped logger instance for module diagnostics.
 */
/** @param { import("@11ty/eleventy/src/UserConfig.js").default } eleventyConfig */
export default function multilangCore(eleventyConfig, moduleContext) {
	const { state, runtime, log } = moduleContext;
	const settings = state.settings;
	const options = state.options;

	const moduleOptions = {
		verbose: options.verbose,
		multilingual: options.multilingual,
		defaultLanguage: settings.defaultLanguage,
		languages: settings.languages
	};

	// --- Language normalization ---
	// Accept languages as array or object; normalize to object map.
	// Drives collection building, locale data, and sitemap-core language config.
	moduleOptions.languages = langNormalization(moduleOptions, log);
	const hasLanguages = moduleOptions.languages && Object.keys(moduleOptions.languages).length > 0;
	const isMultilingual = moduleOptions.multilingual === true && moduleOptions.defaultLanguage && hasLanguages;

	if (!isMultilingual) return;

	// Register Eleventy's built-in I18nPlugin for locale-aware URL resolution.
	eleventyConfig.addPlugin(I18nPlugin, {
		defaultLanguage: moduleOptions.defaultLanguage,
		errorMode: 'allow-fallback'
	});

	// Build a set of allowed language codes for validation during collection building.
	const normalizeLanguageCode = (lang) => (lang || '').toLowerCase().trim();
	const allowedLanguages = new Set(Object.keys(moduleOptions.languages).map(normalizeLanguageCode));

	// Computed locale data: every page gets a page.locale object with its
	// resolved lang, translationKey, and whether it's the default language.
	eleventyConfig.addGlobalData('eleventyComputed.page.locale', () => {
		return (data) => {
			const lang = normalizeLanguageCode(data.lang || data.language || moduleOptions.defaultLanguage);
			const translationKey = data.translationKey;
			const isDefaultLang = lang === normalizeLanguageCode(moduleOptions.defaultLanguage);

			return {
				translationKey,
				lang,
				isDefaultLang
			};
		};
	});

	// Build both the map (keyed by translationKey → lang) and the flat list.
	// Shared logic for both collections — called once per collection registration.
	const buildTranslations = (collection) => {
		const map = {};
		const list = [];

		for (const page of collection.getAll()) {
			const translationKey = page.data.translationKey;
			if (!translationKey) continue;

			const lang = page.data.lang || page.data.language || moduleOptions.defaultLanguage;
			if (!lang) continue;

			if (allowedLanguages.size && !allowedLanguages.has(lang)) {
				log.info(`Unknown lang "${lang}" in ${page.inputPath}`);
				continue;
			}

			const locale = { locale: { translationKey, lang, isDefaultLang: lang === moduleOptions.defaultLanguage } };
			const safeCopy = DeepCopy(page, locale);
			list.push(safeCopy);

			if (!map[translationKey]) map[translationKey] = {};
			map[translationKey][lang] = {
				title: page.data.title,
				url: page.url,
				lang,
				isDefaultLang: lang === moduleOptions.defaultLanguage,
				data: page.data
			};
		}

		return { map, list };
	};

	// --- Collections ---

	// Map form: translationsMap[translationKey][lang] → page metadata.
	eleventyConfig.addCollection('translationsMap', (collection) => {
		const map = buildTranslations(collection).map;
		runtime.translationMap.set(map);
		return map;
	});

	// Flat list: all translatable pages with locale data attached.
	eleventyConfig.addCollection('translations', (collection) => {
		return buildTranslations(collection).list;
	});

	// --- Filters ---
	// Relational helpers for cross-language lookups in templates.
	eleventyConfig.addFilter('i18nTranslationsFor', i18nTranslationsFor);
	eleventyConfig.addFilter('i18nTranslationIn', i18nTranslationIn);
	eleventyConfig.addFilter('i18nDefaultTranslation', i18nDefaultTranslation);
}
