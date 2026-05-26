import { I18nPlugin } from '@11ty/eleventy';
import { DeepCopy } from '@11ty/eleventy-utils';
import {
	normalizeLang,
	normalizeLocale,
	deriveLang,
	resolveDefault
} from '../../core/locale/index.js';
import { normalizeLanguageMap } from '../../core/utils/normalize-language-map.js';
import i18nTranslationsFor from './filters/i18n-translations-for.js';
import i18nTranslationIn from './filters/i18n-translation-in.js';
import i18nDefaultTranslation from './filters/i18n-default-translation.js';

/**
 * Multilang (module)
 *
 * Language infrastructure. Normalises language config, builds translation
 * relationships, attaches per-page lang / locale / translationKey /
 * isDefaultLang fields, and exposes cross-language lookup filters. Active
 * only when options.multilingual is true and both defaultLanguage and at
 * least one languages entry are set; otherwise the module exits early.
 *
 * Architecture layer:
 *   module
 *
 * System role:
 *   Wraps Eleventy's I18nPlugin and feeds the translation-map store that
 *   head reads at transform-time. Sitemap reuses the same normalised
 *   language map.
 *
 * Lifecycle:
 *   build-time   → normalise languages, attach I18nPlugin, register filters
 *                  and computed page.lang / page.locale / page.translationKey
 *                  / page.isDefaultLang
 *   cascade-time → translationsMap and translations collections build the
 *                  per-translationKey map and write it to the store
 *
 * Why this exists:
 *   I18nPlugin handles locale-aware routing but not translation
 *   relationships. Head needs a transform-time-readable hreflang map; the
 *   collection populates it once and the store carries it across the
 *   lifecycle boundary.
 *
 * Scope:
 *   Owns language normalisation, per-page flat locale fields (lang, locale,
 *   translationKey, isDefaultLang), the translations and translationsMap
 *   collections, and the i18n filters (i18nTranslationsFor,
 *   i18nTranslationIn, i18nDefaultTranslation). Does not own URL routing
 *   (I18nPlugin) or hreflang rendering (head).
 *
 * Data flow:
 *   settings.languages + page.lang/locale/translationKey → normalisation
 *   + I18nPlugin → collections + flat computed page fields +
 *   translation-map store → head, sitemap
 *
 * @param {import("@11ty/eleventy/src/UserConfig.js").default} eleventyConfig
 * @param {Object} moduleContext
 */
export function multilangCore(eleventyConfig, moduleContext) {
	const { state, runtime, log } = moduleContext;
	const { settings, options } = state;

	// --- Default resolution ---
	// resolveDefault returns { lang, locale } from settings.defaultLocale (preferred)
	// or settings.defaultLanguage (cosmetic alias; locale derived via Intl.Locale,
	// returning the bare language subtag when no region is given).
	const { lang: defaultLanguage, locale: defaultLocale } = resolveDefault(settings);
	const languages = normalizeLanguageMap(settings, log);
	const hasLanguages = languages && Object.keys(languages).length > 0;

	const isMultilingual = options.multilang === true && defaultLanguage && hasLanguages;

	if (!isMultilingual) {
		log.info('Multilang inactive, needs options.multilang, settings.defaultLanguage, and languages');
		return;
	}

	log.info(`Multilang active: ${Object.keys(languages).join('/')} (default: ${defaultLanguage})`);

	// Register Eleventy's built-in I18nPlugin for locale-aware URL resolution.
	eleventyConfig.addPlugin(I18nPlugin, {
		defaultLanguage: defaultLanguage,
		errorMode: 'allow-fallback'
	});

	// --- Per-page resolvers ---
	// Shared between the four flat eleventyComputed registrations below and
	// the buildTranslations collection iterator. Closes over defaults and
	// the languages map.
	//
	// Accept `language` as a writer-side alias for `lang`. Cheap, forgiving,
	// and means existing front matter using either spelling keeps working.
	// Also derives lang from data.locale when neither is set.
	function resolvePageLang(data) {
		return (
			normalizeLang(data.lang || data.language || deriveLang(data.locale)) || defaultLanguage
		);
	}

	function resolvePageLocale(data) {
		if (data.locale) return normalizeLocale(data.locale);
		const lang = resolvePageLang(data);
		return normalizeLocale(languages?.[lang]?.locale) ?? defaultLocale;
	}

	// --- Computed per-page fields ---
	// Four independent registrations merge cleanly at the leaves (validated
	// 2026-05-25 via temp/workbench/multilang-glow-up/eleventy-probe/).
	// Replaces the historical single-bag page.locale object with flat
	// siblings on page.
	eleventyConfig.addGlobalData(
		'eleventyComputed.page.lang',
		() => (data) => resolvePageLang(data)
	);
	eleventyConfig.addGlobalData(
		'eleventyComputed.page.locale',
		() => (data) => resolvePageLocale(data)
	);
	eleventyConfig.addGlobalData(
		'eleventyComputed.page.translationKey',
		() => (data) => data.translationKey
	);
	eleventyConfig.addGlobalData(
		'eleventyComputed.page.isDefaultLang',
		() => (data) => resolvePageLang(data) === defaultLanguage
	);

	// Build a set of allowed language codes for validation during collection building.
	const allowedLanguages = new Set(Object.keys(languages).map(normalizeLang));

	// Build both the map (keyed by translationKey → lang) and the flat list.
	// Shared logic for both collections — called once per collection registration.
	const buildTranslations = (collection) => {
		const map = {};
		const list = [];

		for (const page of collection.getAll()) {
			const translationKey = page.data.translationKey;
			if (!translationKey) continue;

			const lang = resolvePageLang(page.data);
			if (!lang) continue;

			if (allowedLanguages.size && !allowedLanguages.has(lang)) {
				log.info(`Unknown lang "${lang}" in ${page.inputPath}`);
				continue;
			}

			const isDefaultLang = lang === defaultLanguage;
			const locale = resolvePageLocale(page.data);

			// Attach flat per-page fields. Mirrors the eleventyComputed shape
			// so collection consumers read item.lang / item.locale /
			// item.translationKey / item.isDefaultLang directly.
			const safeCopy = DeepCopy(page, { lang, locale, translationKey, isDefaultLang });
			list.push(safeCopy);

			if (!map[translationKey]) map[translationKey] = {};
			map[translationKey][lang] = {
				title: page.data.title,
				url: page.url,
				lang,
				isDefaultLang,
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
