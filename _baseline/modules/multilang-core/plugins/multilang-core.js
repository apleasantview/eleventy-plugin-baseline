import { I18nPlugin } from '@11ty/eleventy';
import { DeepCopy } from '@11ty/eleventy-utils';
import { langNormalization } from '../../../core/helpers.js';
import i18nTranslationsFor from '../filters/i18n-translations-for.js';
import i18nTranslationIn from '../filters/i18n-translation-in.js';
import i18nDefaultTranslation from '../filters/i18n-default-translation.js';

/**
 * eleventy-plugin-multilang-core
 *
 * Language infrastructure for multilingual sites. Normalizes language metadata,
 * builds a translations map keyed by translationKey + lang, and exposes
 * relational filters for cross-language lookups. Wraps Eleventy's built-in
 * I18nPlugin with stricter language validation.
 *
 * Depends on: Eleventy I18nPlugin (built-in), @11ty/eleventy-utils (DeepCopy),
 * and the shared langNormalization helper from core/helpers.js.
 *
 * Options:
 *  - defaultLanguage (string, default 'en'): fallback language code.
 *  - languages (array|object): allowed languages. Pages with unlisted langs are skipped.
 *  - multilingual (boolean, default false): enable multilingual mode.
 *  - verbose (boolean, default false): warn on unknown language codes.
 *
 * @param { import("@11ty/eleventy/src/UserConfig.js").default } eleventyConfig
 */
export default function multilangCore(eleventyConfig, options = {}) {
	const userOptions = {
		defaultLanguage: 'en',
		languages: [],
		verbose: false,
		...options
	};

	// --- Language normalization ---
	// Accept languages as array or object; normalize to object map.
	// Drives collection building, locale data, and sitemap-core language config.
	userOptions.languages = langNormalization(userOptions);

	const hasLanguages = userOptions.languages && Object.keys(userOptions.languages).length > 0;
	const isMultilingual = userOptions.multilingual === true && userOptions.defaultLanguage && hasLanguages;

	if (!isMultilingual) return;

	// Register Eleventy's built-in I18nPlugin for locale-aware URL resolution.
	eleventyConfig.addPlugin(I18nPlugin, {
		defaultLanguage: userOptions.defaultLanguage,
		errorMode: 'allow-fallback'
	});

	// Build a set of allowed language codes for validation during collection building.
	const normalizeLanguageCode = (lang) => (lang || '').toLowerCase().trim();
	const allowedLanguages = new Set(
		Object.keys(userOptions.languages).map(normalizeLanguageCode)
	);

	// Computed locale data: every page gets a page.locale object with its
	// resolved lang, translationKey, and whether it's the default language.
	eleventyConfig.addGlobalData('eleventyComputed.page.locale', () => {
		return (data) => {
			const lang = normalizeLanguageCode(data.lang || data.language || userOptions.defaultLanguage);
			const translationKey = data.translationKey;
			const isDefaultLang = lang === normalizeLanguageCode(userOptions.defaultLanguage);

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

			const lang = page.data.lang || page.data.language || userOptions.defaultLanguage;
			if (!lang) continue;

			if (allowedLanguages.size && !allowedLanguages.has(lang)) {
				if (userOptions.verbose) {
					console.warn(`[baseline:multilang-core] Unknown lang "${lang}" in ${page.inputPath}`);
				}
				continue;
			}

			const locale = { locale: { translationKey, lang, isDefaultLang: lang === userOptions.defaultLanguage } };
			const safeCopy = DeepCopy(page, locale);
			list.push(safeCopy);

			if (!map[translationKey]) map[translationKey] = {};
			map[translationKey][lang] = {
				title: page.data.title,
				url: page.url,
				lang,
				isDefaultLang: lang === userOptions.defaultLanguage,
				data: page.data
			};
		}

		return { map, list };
	};

	// --- Collections ---

	// Map form: translationsMap[translationKey][lang] → page metadata.
	eleventyConfig.addCollection('translationsMap', (collection) => {
		return buildTranslations(collection).map;
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
