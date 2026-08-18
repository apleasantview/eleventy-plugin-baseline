export default {
	section: ['system'],
	permalink: `/system/{{ slug }}/`,
	layout: 'layouts/page.njk',
	noindex: true,
	sitemap: {
		ignore: true
	},
	eleventyExcludeFromCollections: true,
	baselineExcludeFromGraph: true
};
