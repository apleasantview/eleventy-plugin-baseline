// Loaded here so the file reads its own environment, whatever imported it first.
import 'dotenv/config';

const baseUrl = URL.parse(process.env.BASELINE_URL ?? '');
const siteUrl = baseUrl?.protocol === 'https:' || baseUrl?.protocol === 'http:' ? baseUrl.href : undefined;
const absolute = (path) => (siteUrl ? new URL(path, siteUrl).href : undefined);

export default {
	organization: {
		'@type': 'Organization',
		name: 'a pleasant view',
		legalName: null,
		url: 'https://www.apleasantview.com/',
		email: 'hello@apleasantview.com',
		telephone: null,
		address: null,
		geo: null,
		areaServed: null,
		taxID: '60532955', // KvK
		vatID: null,
		foundingDate: null,
		logo: siteUrl ? { url: absolute('/logo.png'), width: 400, height: 400 } : null,
		sameAs: [
			'https://mastodon.social/@crisverstraeten',
			'https://github.com/apleasantview',
			'https://www.linkedin.com/company/apleasantview'
		],
		knowsAbout: ['Eleventy', 'Static site generators', 'Plugin architecture', 'Web standards', 'Open source software'],
		slogan: null // null = fall back to site.tagline per language
	},

	person: {
		'@type': 'Person',
		name: 'Cristovao Verstraeten',
		givenName: 'Cristovao',
		familyName: 'Verstraeten',
		url: 'https://www.apleasantview.com/about/', // TODO: point at a baseline-site /about/ once that page exists
		email: null,
		image: null,
		jobTitle: 'Independent software developer',
		sameAs: [
			'https://mastodon.social/@crisverstraeten',
			'https://github.com/cristovaov',
			'https://www.linkedin.com/in/cristovaoverstraeten/'
		]
		// worksFor wired by the graph builder via @id reference
	}
};
