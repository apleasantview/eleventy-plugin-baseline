export default {
	title: 'Eleventy Plugin Baseline',
	tagline: 'A magic carpet ride',
	url: process.env.URL || 'http://localhost:8080/',
	noindex: false,

	defaultLanguage: 'en',
	languages: {
		en: {
			contentDir: 'content/en/',
			languageCode: 'en',
			languageName: 'English',
			title: 'Eleventy Plugin Baseline',
			tagline: 'A magic carpet ride'
		},
		nl: {
			contentDir: 'content/nl/',
			languageCode: 'nl',
			languageName: 'Nederlands',
			title: 'Eleventy Plugin Baseline',
			tagline: 'Een rit op een magisch tapijt'
		},
		fr: {
			contentDir: 'content/fr/',
			languageCode: 'fr',
			languageName: 'Français',
			title: 'Eleventy Plugin Baseline',
			tagline: 'Un tour en tapis volant'
		}
	},

	head: {
		link: [{ rel: 'stylesheet', href: '/assets/css/index.css' }],
		script: [
			{ src: '/assets/js/index.js', defer: true },
			{ src: '/assets/js/vendor/index.js', defer: true }
		],
		meta: [{ name: 'color-scheme', content: 'light dark' }]
	},

	seo: {}
};
