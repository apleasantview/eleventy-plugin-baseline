import { I18nPlugin } from '@11ty/eleventy';

/** @param { import("@11ty/eleventy/src/UserConfig.js").default } eleventyConfig */
export default function multilangCore(eleventyConfig, options = {}) {
	const userOptions = {
		defaultLanguage: 'en',
		languages: [],
		...options
	};

	eleventyConfig.addPlugin(I18nPlugin, {
		defaultLanguage: userOptions.defaultLanguage,
		errorMode: 'allow-fallback'
	});

	// Add translations collection
	eleventyConfig.addCollection('translations', function (collection) {
		const translations = {};
		const languages = userOptions.languages;
		const allowed = new Set(Array.isArray(languages) ? languages : Object.keys(languages || {}));

		for (const page of collection.getAll()) {
			const translationKey = page.data.translationKey;
			if (!translationKey) continue;

			const lang = page.data.lang || page.data.language || userOptions.defaultLanguage;
			if (!lang) continue;

			if (allowed.size && !allowed.has(lang)) {
				if (userOptions.verbose) {
					console.warn(`[baseline] Unknown lang "${lang}" in ${page.inputPath}`);
				}
				continue;
			}

			if (!translations[translationKey]) translations[translationKey] = {};
			translations[translationKey][lang] = {
				title: page.data.title,
				url: page.url,
				lang,
				isDefault: lang === userOptions.defaultLanguage,
				data: page.data
			};
		}

		return translations;
	});
}
