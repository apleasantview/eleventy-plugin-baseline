const siteUrl = process.env.BASE_URL;

// Identity has no floor: without an origin there is nothing to resolve these
// against, and a relative URL inside JSON-LD is worse than an absent one.
// Missing BASE_URL costs the image, not the build.
const absolute = (path) => (siteUrl ? new URL(path, siteUrl).href : undefined);

export default {
	title: 'Eleventy Baseline',
	tagline: 'Start building your site and skip the setup work.',
	url: siteUrl,
	noindex: false,

	defaultLanguage: 'en',
	languages: {
		en: {
			contentDir: 'content/en/',
			locale: 'en',
			languageName: 'English',
			title: 'Eleventy Baseline',
			tagline: 'Start building your site and skip the setup work.'
		},
		nl: {
			contentDir: 'content/nl/',
			locale: 'nl',
			languageName: 'Nederlands',
			title: 'Eleventy Baseline',
			tagline: 'Start met het bouwen aan je site en sla de setup over.'
		},
		fr: {
			contentDir: 'content/fr/',
			locale: 'fr',
			languageName: 'Français',
			title: 'Eleventy Baseline',
			tagline: 'Commencez à construire votre site sans vous occuper de la configuration.'
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
		ogImage: siteUrl ? { url: absolute('/og.jpg'), width: 1200, height: 630, alt: 'Eleventy Baseline' } : null,
		openGraph: { type: 'website' },
		twitter: { card: 'summary_large_image' }
	}
};
