import { getWeight, ElementWeights } from '@rviscomi/capo.js';
import { capoPosthtmlAdapter as adapter } from './capo-adapter.js';
import { dedupeMeta, dedupeLink } from '../utils/dedupe.js';

/**
 * PostHTML head driver (driver)
 *
 * Default head renderer. Emits standard meta tags, layers user extras and
 * hreflang alternates on top, dedupes, capo-sorts, and replaces the
 * <baseline-head> placeholder with the result.
 *
 * Architecture layer:
 *   module
 *
 * System role:
 *   The seam between head's pipeline and the renderer choice. Alternate
 *   drivers can be substituted at the import site without changing the
 *   cascade-time seed builder.
 *
 * Lifecycle:
 *   transform-time → emit, dedupe, sort, mutate the PostHTML tree
 *
 * Why this exists:
 *   Splitting the renderer from the seed builder lets head swap rendering
 *   strategies (e.g. a future direct-DOM driver) without touching cascade
 *   wiring or the page-context shape.
 *
 * Scope:
 *   Owns node emission, dedupe orchestration, capo sort, and placeholder
 *   replacement. Owns the og:/twitter: vocabulary: the seo substrate hands
 *   over short structured keys, this driver maps them to <meta>/<script>.
 *   Does not own seed shape (page context), the seo projection
 *   (core/seo-graph), hreflang building (head/utils/alternates.js), or capo's
 *   element weights (capo.js).
 *
 * Data flow:
 *   seeds + seo + alternates + options → emit → dedupe → capo-sort → PostHTML
 *   tree mutation
 *
 * @param {Object} args
 * @param {Object} args.seeds - Page context for the current page.
 * @param {Object} [args.seo] - Resolved seo namespace (url, graph, openGraph, twitter).
 * @param {Array<Object>} args.alternates - hreflang link descriptors.
 * @param {Object} args.options - Head options (titleSeparator, showGenerator).
 * @param {string} args.placeholderTag - Placeholder element to replace.
 * @param {string} args.eol - End-of-line separator interleaved between nodes.
 * @returns {(tree: Object) => Object} PostHTML plugin function.
 */
export function renderHead({ seeds, seo, alternates, options, placeholderTag, eol }) {
	// seo.url is the canonical source, resolved at cascade-time. It is undefined
	// on noindex / no-settings.url pages, where the seo layer deliberately drops
	// the canonical — emitMeta's guard then emits nothing, which is correct. The
	// seo handle is present whenever a head renders (same skip set as page
	// context), so there is no absent-handle case to fall back for.
	const canonical = seo?.url;
	const defaults = emitMeta(seeds.meta, seeds.render, options, canonical);
	const extras = emitExtras(seeds.head, alternates);
	const { meta: seoMeta, multi: seoMulti, scripts: seoScripts } = emitSeo(seo);

	// seo emits last so the substrate wins a property collision with settings.head.
	// Multi-valued tags and JSON-LD bypass dedupe (property-keyed last-wins would
	// collapse repeated og:locale:alternate / article:author to one).
	const deduped = dedupeAll([...defaults, ...extras, ...seoMeta]);
	const sorted = capoSort([...deduped, ...seoMulti, ...seoScripts]);

	return function rendererPlugin(tree) {
		tree.match({ tag: placeholderTag }, () => ({
			tag: 'head',
			content: interleaveEOL(sorted, eol)
		}));
		return tree;
	};
}

function emitMeta(meta, render, options, canonical) {
	const nodes = [];
	nodes.push(mkMeta({ charset: 'UTF-8' }));
	nodes.push(mkMeta({ name: 'viewport', content: 'width=device-width, initial-scale=1.0' }));
	if (meta.title) nodes.push({ tag: 'title', content: [meta.title] });
	if (meta.description) nodes.push(mkMeta({ name: 'description', content: meta.description }));
	nodes.push(mkMeta({ name: 'robots', content: meta.robots }));
	if (canonical) nodes.push(mkLink({ rel: 'canonical', href: canonical }));
	if (options.showGenerator && render.generator) {
		nodes.push(mkMeta({ name: 'generator', content: render.generator }));
	}

	return nodes;
}

/**
 * Map the resolved seo projection to head nodes. The substrate hands over short
 * structured keys; this driver owns the og:/twitter: vocabulary. Single-valued
 * tags ride the deduped meta flow; multi-valued ones (og:locale:alternate,
 * repeated article:author / article:tag) go in `multi` to skip the property-keyed dedupe.
 * The JSON-LD graph rides `scripts` (the adapter returns a bare @graph array,
 * wrapped in its @context envelope here).
 *
 * @param {Object} [seo] - Resolved seo namespace (graph, openGraph, twitter).
 * @returns {{ meta: Array<Object>, multi: Array<Object>, scripts: Array<Object> }}
 */
function emitSeo(seo) {
	const meta = [];
	const multi = [];
	const scripts = [];
	if (!seo) return { meta, multi, scripts };

	const og = seo.openGraph ?? {};
	const tw = seo.twitter ?? {};

	const prop = (property, content) => {
		if (content !== undefined && content !== null && content !== '') meta.push(mkMeta({ property, content }));
	};
	const name = (key, content) => {
		if (content !== undefined && content !== null && content !== '') meta.push(mkMeta({ name: key, content }));
	};

	prop('og:title', og.title);
	prop('og:type', og.type);
	prop('og:description', og.description);
	prop('og:url', og.url);
	prop('og:site_name', og.siteName);
	prop('og:locale', og.locale);
	prop('og:image', og.image);
	prop('og:image:alt', og.imageAlt);
	if (og.imageWidth !== undefined) prop('og:image:width', String(og.imageWidth));
	if (og.imageHeight !== undefined) prop('og:image:height', String(og.imageHeight));

	for (const loc of asArray(og.localeAlternate)) {
		if (loc) multi.push(mkMeta({ property: 'og:locale:alternate', content: loc }));
	}

	if (og.article) {
		prop('article:published_time', og.article.publishedTime);
		prop('article:modified_time', og.article.modifiedTime);
		prop('article:section', og.article.section);
		for (const author of asArray(og.article.authors)) {
			if (author) multi.push(mkMeta({ property: 'article:author', content: author }));
		}
		for (const tag of asArray(og.article.tags)) {
			if (tag) multi.push(mkMeta({ property: 'article:tag', content: tag }));
		}
	}

	name('twitter:card', tw.card);
	name('twitter:site', tw.site);
	name('twitter:creator', tw.creator);
	name('twitter:title', tw.title);
	name('twitter:description', tw.description);
	name('twitter:image', tw.image);

	if (seo.graph?.length) {
		const content = JSON.stringify({ '@context': 'https://schema.org', '@graph': seo.graph });
		scripts.push(mkScript({ type: 'application/ld+json', content }));
	}

	return { meta, multi, scripts };
}

function emitExtras(head, alternates = []) {
	const nodes = [];
	for (const m of asArray(head?.meta)) nodes.push(mkMeta(m));
	for (const l of asArray(head?.link)) {
		if (l?.rel === 'canonical') continue; // 🚨 remove duplication source
		nodes.push(mkLink(l));
	}
	for (const s of asArray(head?.script)) nodes.push(mkScript(s));
	for (const s of asArray(head?.style)) nodes.push(mkStyle(s));
	for (const a of alternates) nodes.push(mkLink(a));

	return nodes;
}

function dedupeAll(nodes) {
	const metas = [];
	const links = [];
	const others = [];
	for (const n of nodes) {
		if (n.tag === 'meta') metas.push(n.attrs || {});
		else if (n.tag === 'link') links.push(n.attrs || {});
		else others.push(n);
	}
	const dedupedMetas = dedupeMeta(metas).map(mkMeta);
	const dedupedLinks = dedupeLink(links).map(mkLink);

	return [...dedupedMetas, ...dedupedLinks, ...others];
}

function capoSort(nodes) {
	const weighted = nodes.map((node, i) => ({
		node,
		i,
		weight: adapter.isElement(node) ? getWeight(node, adapter) : ElementWeights.OTHER
	}));
	weighted.sort((a, b) => b.weight - a.weight || a.i - b.i);

	return weighted.map((w) => w.node);
}

function mkMeta(attrs) {
	return { tag: 'meta', attrs };
}
function mkLink(attrs) {
	return { tag: 'link', attrs };
}
function mkScript(entry) {
	const { content, ...attrs } = entry || {};
	return content !== undefined ? { tag: 'script', attrs, content: [content] } : { tag: 'script', attrs };
}
function mkStyle(entry) {
	const { content, ...attrs } = entry || {};
	return content !== undefined ? { tag: 'style', attrs, content: [content] } : { tag: 'style', attrs };
}
function asArray(v) {
	return Array.isArray(v) ? v : [];
}
function interleaveEOL(nodes, eol) {
	const out = [];
	for (const n of nodes) out.push(n, eol);
	return out;
}
