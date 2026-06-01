// schema.org identity for the site: who published it.
// Cascade key: schema (`schema.organization`, `schema.person`).
// Read by the seo-graph substrate; null fields are dropped from the graph.
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
		logo: null, // TODO: baseline-site logo asset
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
