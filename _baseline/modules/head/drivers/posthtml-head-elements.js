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
 * @param {Object} [args.seo] - Resolved _seoGraph namespace (url, schema, openGraph, twitter).
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

		// Only after the placeholder has become a real <head>, and in this same
		// pass: the fold needs a head to fold into, and Eleventy's htmlTransformer
		// exists so every plugin shares one parse per page.
		foldStrays(tree, eol);
		return tree;
	};
}

// Metadata elements the HTML parser moves into <head> when it meets them after
// the head has closed. Anything else there implies <body>, so leaving it where
// it sits is the conservative reading of malformed input.
//
// The spec's "after head" list also carries `basefont`, `bgsound` and
// `noframes`, all legacy, all deliberately omitted.
const FOLDABLE = new Set(['base', 'link', 'meta', 'noscript', 'script', 'style', 'template', 'title']);

/**
 * Move metadata siblings stranded between `</head>` and `<body>` into the head.
 *
 * The documented escape hatch puts tags below the placeholder, and browsers fold
 * them back, so the rendered DOM has always been correct. The file on disk was
 * not, unless something in the build re-parsed it with a spec-compliant parser.
 * Eleventy Excellent folds by accident, because its WebC plugin re-parses every
 * page with parse5; a project without WebC shipped the strays outside the head.
 *
 * Appends rather than capo-sorting, because the hatch is documented as skipping
 * dedupe and sorting. That is correct for metadata, where position carries no
 * meaning, and is the reason anything order-sensitive belongs in `settings.head`.
 *
 * Every guard here degrades to leaving the tree untouched.
 *
 * @param {Object} tree - PostHTML tree.
 * @param {string} eol - Separator interleaved between folded nodes.
 * @returns {Object} The same tree.
 */
function foldStrays(tree, eol) {
	tree.match({ tag: 'html' }, (node) => {
		if (!Array.isArray(node.content)) return node;

		const headIndex = node.content.findIndex((n) => n?.tag === 'head');
		const bodyIndex = node.content.findIndex((n) => n?.tag === 'body');
		if (headIndex === -1 || bodyIndex === -1 || bodyIndex < headIndex) return node;

		const head = node.content[headIndex];
		if (!Array.isArray(head.content)) return node;

		const kept = [];
		const folded = [];
		for (const child of node.content.slice(headIndex + 1, bodyIndex)) {
			if (child?.tag && FOLDABLE.has(child.tag)) folded.push(child);
			else kept.push(child);
		}
		if (!folded.length) return node;

		head.content = [...head.content, ...interleaveEOL(folded, eol)];
		node.content = [...node.content.slice(0, headIndex + 1), ...kept, ...node.content.slice(bodyIndex)];
		return node;
	});

	return tree;
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

	if (seo.schema?.length) {
		const content = JSON.stringify({ '@context': 'https://schema.org', '@graph': seo.schema });
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
