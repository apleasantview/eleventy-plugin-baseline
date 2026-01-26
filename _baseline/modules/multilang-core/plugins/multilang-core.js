import { I18nPlugin } from '@11ty/eleventy';
import { DeepCopy } from '@11ty/eleventy-utils';

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

	const allowedLanguages = new Set(
		Array.isArray(userOptions.languages) ? userOptions.languages : Object.keys(userOptions.languages || {})
	);

	const buildTranslationsMap = (collection) => {
		const map = {};

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

			if (!map[translationKey]) map[translationKey] = {};
			map[translationKey][lang] = {
				title: page.data.title,
				url: page.url,
				lang,
				isDefaultLang: lang === userOptions.defaultLanguage,
				data: page.data
			};
		}

		return map;
	};

	// Map form for direct lookups
	eleventyConfig.addCollection('translationsMap', (collection) => {
		return buildTranslationsMap(collection);
	});

	// Canonical translations collection
	eleventyConfig.addCollection('translations', (collection) => {
		return collection.getAll().flatMap((page) => {
			const translationKey = page.data.translationKey;
			if (!translationKey) return [];

			const lang = page.data.lang || page.data.language || userOptions.defaultLanguage;
			if (!lang) return [];

			if (allowedLanguages.size && !allowedLanguages.has(lang)) {
				if (userOptions.verbose) {
					console.warn(`[baseline:multilang-core] Unknown lang "${lang}" in ${page.inputPath}`);
				}
				return [];
			}

			// Avoid spreading page to prevent early templateContent access
			const locale = { locale: { translationKey, lang, isDefaultLang: lang === userOptions.defaultLanguage } };
			const safeCopy = DeepCopy(page, locale);

			return [safeCopy];
		});
	});

	// Get all translations for the current page
	eleventyConfig.addFilter('i18nTranslationsFor', (page, collection) => {
		if (!page?.locale?.translationKey) return [];

		return collection.filter((p) => p.locale && p.locale.translationKey === page.locale.translationKey);
	});

	// Get a specific language variant for the current page
	eleventyConfig.addFilter('i18nTranslationIn', (page, collection, lang) => {
		if (!page?.locale?.translationKey) return null;

		return (
			collection.find(
				(p) => p.locale && p.locale.translationKey === page.locale.translationKey && p.locale.lang === lang
			) || null
		);
	});

	// Get the default-language variant for the current page
	eleventyConfig.addFilter('i18nDefaultTranslation', (page, collection) => {
		if (!page?.locale?.translationKey) return null;

		return (
			collection.find(
				(p) => p.locale && p.locale.translationKey === page.locale.translationKey && p.locale.isDefaultLang
			) || null
		);
	});
}
