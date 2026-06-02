const siteUrl = process.env.URL || 'http://localhost:8080/';

export default {
	title: 'Eleventy Baseline',
	tagline: 'Start building your site, skip the recurring setup work.',
	url: siteUrl,
	noindex: false,

	defaultLanguage: 'en',
	languages: {
		en: {
			contentDir: 'content/en/',
			locale: 'en',
			languageName: 'English',
			title: 'Eleventy Baseline',
			tagline: 'Start building your site and skip the recurring setup work.'
		},
		nl: {
			contentDir: 'content/nl/',
			locale: 'nl',
			languageName: 'Nederlands',
			title: 'Eleventy Baseline',
			tagline: 'Een rit op een magisch tapijt'
		},
		fr: {
			contentDir: 'content/fr/',
			locale: 'fr',
			languageName: 'Français',
			title: 'Eleventy Baseline',
			tagline: 'Un tour en tapis volant'
		}
	},

	head: {
		link: [
			{ rel: 'stylesheet', href: '/assets/css/index.css' },
			{ rel: 'me', href: 'https://mastodon.social/@crisverstraeten' },
			{ rel: 'icon', type: 'image/png', href: '/favicon-96x96.png', sizes: '96x96' },
			{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
			{ rel: 'shortcut icon', href: '/favicon.ico' },
			{ rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
			{ rel: 'manifest', href: '/site.webmanifest' }
		],
		script: [
			{ src: '/assets/js/index.js', defer: true },
			{ src: '/assets/js/vendor/index.js', defer: true }
		],
		meta: [
			{ name: 'color-scheme', content: 'light dark' },
			{ name: 'theme-color', content: '#ffffff' }
		]
	},

	seo: {
		preserveQueryParams: false,
		ogImage: { url: new URL('/og.jpg', siteUrl).href, width: 1200, height: 630, alt: 'Eleventy Baseline' },
		openGraph: { type: 'website' },
		twitter: { card: 'summary_large_image' }
	}
};
