import { I18nPlugin } from '@11ty/eleventy';
import { DeepCopy } from '@11ty/eleventy-utils';
import i18nTranslationsFor from '../filters/i18n-translations-for.js';
import i18nTranslationIn from '../filters/i18n-translation-in.js';
import i18nDefaultTranslation from '../filters/i18n-default-translation.js';

/**
 * Baseline – multilang-core
 *
 * Responsibilities:
 * - Normalize language metadata
 * - Annotate translatable pages
 * - Expose relational helpers for translations
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

	eleventyConfig.addPlugin(I18nPlugin, {
		defaultLanguage: userOptions.defaultLanguage,
		errorMode: 'allow-fallback'
	});

	// Normalize allowed languages (optionally lower/trim)
	const normalizeLang = (lang) => (lang || '').toLowerCase().trim();
	const allowedLanguages = new Set(
		Array.isArray(userOptions.languages)
			? userOptions.languages.map(normalizeLang)
			: Object.keys(userOptions.languages || {}).map(normalizeLang)
	);

	eleventyConfig.addGlobalData('eleventyComputed.page.locale', () => {
		return (data) => {
			const lang = normalizeLang(data.lang || data.language || userOptions.defaultLanguage);
			const translationKey = data.translationKey;
			const isDefaultLang = lang === normalizeLang(userOptions.defaultLanguage);

			return {
				translationKey,
				lang,
				isDefaultLang
			};
		};
	});

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

	// Map form for direct lookups
	eleventyConfig.addCollection('translationsMap', (collection) => {
		return buildTranslations(collection).map;
	});

	// Canonical translations collection
	eleventyConfig.addCollection('translations', (collection) => {
		return buildTranslations(collection).list;
	});

	// Filters – relational helpers
	eleventyConfig.addFilter('i18nTranslationsFor', i18nTranslationsFor);
	eleventyConfig.addFilter('i18nTranslationIn', i18nTranslationIn);
	eleventyConfig.addFilter('i18nDefaultTranslation', i18nDefaultTranslation);
}
