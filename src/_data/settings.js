export default {
	title: 'Eleventy Baseline',
	tagline: 'Start building your site, skip the recurring setup work.',
	url: process.env.URL || 'http://localhost:8080/',
	noindex: false,

	defaultLanguage: 'en',
	languages: {
		en: {
			contentDir: 'content/en/',
			languageCode: 'en',
			languageName: 'English',
			title: 'Eleventy Baseline',
			tagline: 'Start building your site and skip the recurring setup work.'
		},
		nl: {
			contentDir: 'content/nl/',
			languageCode: 'nl',
			languageName: 'Nederlands',
			title: 'Eleventy Baseline',
			tagline: 'Een rit op een magisch tapijt'
		},
		fr: {
			contentDir: 'content/fr/',
			languageCode: 'fr',
			languageName: 'Français',
			title: 'Eleventy Baseline',
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
