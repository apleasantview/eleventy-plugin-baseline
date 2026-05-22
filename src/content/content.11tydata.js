import { buildSeoGraph, buildSeoMeta } from '../../utils/seo-graph.js';
import { gitModified } from '../../utils/git-date.js';

const mdAlternates = (data) => ({
	rel: 'alternate',
	type: 'text/markdown',
	href: `${data.page.url}index.md`
});

export default {
	permalink: function (data) {
		if (data.page.inputPath.includes('11tydata.js')) return false;
		const slug = data.slug ? this.slugify(data.slug) : data.page.fileSlug;
		const isDefaultLang = !data.lang || data.lang === data.settings?.defaultLanguage;
		const prefix = isDefaultLang ? '' : `/${data.lang}`;
		const sections = (data.section ?? []).map((s) => this.slugify(s));
		return `${prefix}/${[...sections, slug].join('/')}/`;
	},
	eleventyComputed: {
		page: {
			// Publish date from front matter (Eleventy parses `date:` to a Date).
			datePublished: (data) => data.date,
			// Modified date: front-matter override, else last-commit date for this file.
			// Single source feeds JSON-LD and sitemap so they cannot drift.
			dateModified: (data) => data.dateModified || gitModified(data.page.inputPath)
		},
		sitemap: {
			lastmod: (data) => data.dateModified || gitModified(data.page.inputPath)
		},
		head: {
			// JSON-LD graph emitted into <head> via Baseline's head.script merge.
			// buildSeoGraph reads _navigator.nodes for page identity + translation siblings.
			script: (data) => [
				{
					type: 'application/ld+json',
					content: JSON.stringify(buildSeoGraph(data))
				}
			],
			// OG + Twitter meta. Same data sources as the graph so they cannot drift.
			meta: (data) => buildSeoMeta(data),
			// Add markdown alternates for site pages.
			link: (data) => [mdAlternates(data)]
		}
	}
};
