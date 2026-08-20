export default {
	en: {
		main: [
			{ label: 'Documentation', url: '/docs/' },
			{ label: 'About', url: '/about/' }
		],

		// Grouped into a row per section. The docs pages are English-only, so
		// the nl and fr footers point at the same URL the way their main nav
		// already does.
		footer: [
			{
				label: 'Project',
				items: [
					{ label: 'Documentation', url: '/docs/' },
					{ label: 'About', url: '/about/' },
					{ label: 'Release notes', url: '/release-notes/' },
					{ label: 'FAQ', url: '/faq/' },
					{ label: 'Commercial support', url: '/commercial-support/' },
					{ label: 'Agent discovery', url: '/agent-discovery/' }
				]
			},
			{
				label: 'System',
				items: [
					{ label: 'Sitemap', url: '/sitemap/' },
					{ label: 'Internal links', url: '/system/internal-links/' },
					{ label: 'Outgoing links', url: '/system/outgoing-links/' }
					// { label: 'Profile test', url: '/system/profile-test/' },
					// { label: 'Document test', url: '/system/document-test/' }
				]
			},
			{
				label: 'Elsewhere',
				items: [
					{
						label: 'GitHub',
						url: 'https://github.com/apleasantview/eleventy-plugin-baseline'
					},
					{
						label: 'npm',
						url: 'https://www.npmjs.com/package/@apleasantview/eleventy-plugin-baseline'
					}
				]
			}
		]
	},

	nl: {
		main: [
			{ label: 'Documentatie', url: '/docs/' },
			{ label: 'Over', url: '/nl/about/' }
		],

		footer: [
			{
				label: 'Project',
				items: [
					{ label: 'Documentatie', url: '/docs/' },
					{ label: 'Over', url: '/nl/about/' },
					{ label: 'Releasenotes', url: '/release-notes/' },
					{ label: 'FAQ', url: '/faq/' },
					{ label: 'Commerciële ondersteuning', url: '/nl/commercial-support/' },
					{ label: 'Agent discovery', url: '/agent-discovery/' }
				]
			},
			{
				label: 'Systeem',
				items: [
					{ label: 'Sitemap', url: '/sitemap/' },
					{ label: 'Interne links', url: '/system/internal-links/' },
					{ label: 'Uitgaande links', url: '/system/outgoing-links/' }
				]
			},
			{
				label: 'Elders',
				items: [
					{
						label: 'GitHub',
						url: 'https://github.com/apleasantview/eleventy-plugin-baseline'
					},
					{
						label: 'npm',
						url: 'https://www.npmjs.com/package/@apleasantview/eleventy-plugin-baseline'
					}
				]
			}
		]
	},

	fr: {
		main: [
			{ label: 'Documentation', url: '/docs/' },
			{ label: 'À propos', url: '/fr/about/' }
		],

		footer: [
			{
				label: 'Projet',
				items: [
					{ label: 'Documentation', url: '/docs/' },
					{ label: 'À propos', url: '/fr/about/' },
					{ label: 'Notes de version', url: '/release-notes/' },
					{ label: 'FAQ', url: '/faq/' },
					{ label: 'Support commercial', url: '/fr/commercial-support/' },
					{ label: 'Agent discovery', url: '/agent-discovery/' }
				]
			},
			{
				label: 'Système',
				items: [
					{ label: 'Sitemap', url: '/sitemap/' },
					{ label: 'Liens internes', url: '/system/internal-links/' },
					{ label: 'Liens sortants', url: '/system/outgoing-links/' }
				]
			},
			{
				label: 'Ailleurs',
				items: [
					{
						label: 'GitHub',
						url: 'https://github.com/apleasantview/eleventy-plugin-baseline'
					},
					{
						label: 'npm',
						url: 'https://www.npmjs.com/package/@apleasantview/eleventy-plugin-baseline'
					}
				]
			}
		]
	}
};
