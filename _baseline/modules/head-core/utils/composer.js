import { getWeight, ElementWeights } from '@rviscomi/capo.js';
import { capoPosthtmlAdapter as adapter } from '../drivers/capo-adapter.js';
import { dedupeMeta, dedupeLink } from './dedupe.js';
import pick from './pick.js';

// Robots defaults — seo-graph style, kept in one place.
const ROBOTS_DEFAULT = 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';
const ROBOTS_NOINDEX = 'noindex, nofollow';

/**
 * Transform-time composer.
 *
 * Takes the seed bag produced by the cascade collector, composes scalar
 * fields (title, description, canonical, robots), emits default <head>
 * nodes, merges user extras, dedupes, capo-sorts, and returns a posthtml
 * plugin that replaces the placeholder tag with the result.
 *
 * Pure function — no access to Eleventy runtime or config. Everything
 * the composer needs is in `seeds`.
 *
 * @param {Object} args
 * @param {Object} args.seeds - Seed bag from collector.
 * @param {Object} args.options - Resolved head-core plugin options.
 * @param {string} args.placeholderTag - Tag to replace (e.g. 'baseline-head').
 * @param {string} args.eol - Line separator between emitted nodes.
 * @param {Object} args.log - Scoped logger.
 * @returns {Function} PostHTML plugin.
 */
export function composeHead({ seeds, options, placeholderTag, eol, log }) {
	const composed = {
		title: composeTitle(seeds, options.titleSeparator),
		description: pick(seeds.pageDescription, seeds.siteTagline, ''),
		canonical: composeCanonical(seeds),
		robots: composeRobots(seeds),
		generator: seeds.generator
	};

	const defaults = emitDefaults(composed, options);
	const extras = emitExtras(seeds.extras);

	const deduped = dedupeAll([...defaults, ...extras]);
	const sorted = capoSort(deduped);

	return function composerPlugin(tree) {
		log.info('injecting head for', seeds.pageInputPath || seeds.pageUrl);
		tree.match({ tag: placeholderTag }, () => ({
			tag: false,
			content: interleaveEOL(sorted, eol)
		}));
		return tree;
	};
}

// --- Compose helpers ---

function composeTitle(seeds, separator) {
	const { siteTitle, siteTagline, pageTitle, pageUrl } = seeds;
	const isHome = pageUrl === '/';
	if (isHome) {
		return siteTagline ? `${siteTitle}${separator}${siteTagline}` : siteTitle;
	}
	if (!pageTitle) return siteTitle;
	if (!siteTitle || pageTitle === siteTitle) return pageTitle;
	return `${pageTitle}${separator}${siteTitle}`;
}

function composeCanonical(seeds) {
	if (seeds.siteNoindex || seeds.pageNoindex) return undefined;
	if (!seeds.canonicalPath) return undefined;
	if (!seeds.siteUrl) return seeds.canonicalPath;
	return new URL(seeds.canonicalPath, seeds.siteUrl).href;
}

function composeRobots(seeds) {
	return seeds.siteNoindex || seeds.pageNoindex ? ROBOTS_NOINDEX : ROBOTS_DEFAULT;
}

// --- Emit helpers ---

function emitDefaults(composed, options) {
	const nodes = [];
	nodes.push(mkMeta({ charset: 'UTF-8' }));
	nodes.push(mkMeta({ name: 'viewport', content: 'width=device-width, initial-scale=1.0' }));
	if (composed.title) nodes.push({ tag: 'title', content: [composed.title] });
	if (composed.description) nodes.push(mkMeta({ name: 'description', content: composed.description }));
	nodes.push(mkMeta({ name: 'robots', content: composed.robots }));
	if (composed.canonical) nodes.push(mkLink({ rel: 'canonical', href: composed.canonical }));
	if (options.showGenerator && composed.generator) {
		nodes.push(mkMeta({ name: 'generator', content: composed.generator }));
	}
	return nodes;
}

function emitExtras(extras) {
	const nodes = [];
	for (const m of asArray(extras?.meta)) nodes.push(mkMeta(m));
	for (const l of asArray(extras?.link)) nodes.push(mkLink(l));
	for (const s of asArray(extras?.script)) nodes.push(mkScript(s));
	for (const s of asArray(extras?.style)) nodes.push(mkStyle(s));
	return nodes;
}

// --- Dedupe across the composed node list ---
// dedupeMeta / dedupeLink operate on attrs arrays, so we split, dedupe,
// and re-wrap. Everything else passes through in input order.

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

// --- Capo stable sort (descending by weight, input order tiebreak) ---

function capoSort(nodes) {
	const weighted = nodes.map((node, i) => ({
		node,
		i,
		weight: adapter.isElement(node) ? getWeight(node, adapter) : ElementWeights.OTHER
	}));
	weighted.sort((a, b) => b.weight - a.weight || a.i - b.i);
	return weighted.map((w) => w.node);
}

// --- Node-shape helpers ---

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
