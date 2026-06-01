import { buildSeoMeta } from '../../utils/seo-graph.js';
import { gitModified } from '../../utils/git-date.js';

const mdAlternates = (data) => {
	if (data.baselineExcludeFromGraph) return [];
	return [
		{
			rel: 'alternate',
			type: 'text/markdown',
			href: `${data.page.url}index.md`
		}
	];
};

export default {
	type: 'page',
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
			// Reads the plugin-resolved graph (data.seo.graph, assembled by the
			// seo-graph substrate); the adapter returns the bare @graph array, so we
			// wrap it in the @context envelope here. Guarded: skipped pages (_internal
			// / non-html) resolve data.seo to null, so emit nothing when there's no
			// graph rather than throwing. Bridge until the head module reads the seo
			// handle directly (bar 4).
			script: (data) => {
				const graph = data.seo?.graph;
				if (!graph?.length) return [];
				return [{ type: 'application/ld+json', content: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }) }];
			},
			// OG + Twitter meta — still via the bridge until 3b lands open-graph.js.
			meta: (data) => buildSeoMeta(data),
			// Add markdown alternates for site pages.
			link: (data) => mdAlternates(data)
		}
	}
};
