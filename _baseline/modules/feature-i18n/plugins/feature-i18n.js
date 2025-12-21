/** @param { import("@11ty/eleventy/src/UserConfig.js").default } eleventyConfig */
export default function (eleventyConfig, options = {}) {
	debugger;
	const config = {
		defaultLanguage: "en",
		languages: {
			en: {
				contentDir: "",
				languageCode: "",
				languageDirection: "",
				languageName: "",
				title: "",
				tagline: ""
			}
		},
		...options
	}

	// Expose i18n configuration globally
	eleventyConfig.addGlobalData("_i18n", config);

	// Add translations collection
	eleventyConfig.addCollection("translations", function (collection) {
		const allPages = collection.getAll();
		const translations = {};

		allPages.forEach(page => {
			if (page.data.translationKey) {
				const translationKey = page.data.translationKey;
				const language = page.data.language;
				const url = page.url;
				const title = page.data.title;

				if (!translations[translationKey]) {
					translations[translationKey] = [];
				}

				translations[translationKey].push({
					title: title,
					language: language,
					url: url
				});
			}
		});

		return translations;
	});
}
