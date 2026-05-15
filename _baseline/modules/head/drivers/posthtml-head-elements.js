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
 *   replacement.
 *   Does not own seed shape (page context), hreflang building
 *   (head/utils/alternates.js), or capo's element weights (capo.js).
 *
 * Data flow:
 *   seeds + alternates + options → emit → dedupe → capo-sort → PostHTML
 *   tree mutation
 *
 * @param {Object} args
 * @param {Object} args.seeds - Page context for the current page.
 * @param {Array<Object>} args.alternates - hreflang link descriptors.
 * @param {Object} args.options - Head options (titleSeparator, showGenerator).
 * @param {string} args.placeholderTag - Placeholder element to replace.
 * @param {string} args.eol - End-of-line separator interleaved between nodes.
 * @returns {(tree: Object) => Object} PostHTML plugin function.
 */
export function renderHead({ seeds, alternates, options, placeholderTag, eol }) {
	const defaults = emitMeta(seeds.meta, seeds.render, options);
	const extras = emitExtras(seeds.head, alternates);

	const deduped = dedupeAll([...defaults, ...extras]);
	const sorted = capoSort(deduped);

	return function rendererPlugin(tree) {
		tree.match({ tag: placeholderTag }, () => ({
			tag: 'head',
			content: interleaveEOL(sorted, eol)
		}));
		return tree;
	};
}

function emitMeta(meta, render, options) {
	const nodes = [];
	nodes.push(mkMeta({ charset: 'UTF-8' }));
	nodes.push(mkMeta({ name: 'viewport', content: 'width=device-width, initial-scale=1.0' }));
	if (meta.title) nodes.push({ tag: 'title', content: [meta.title] });
	if (meta.description) nodes.push(mkMeta({ name: 'description', content: meta.description }));
	nodes.push(mkMeta({ name: 'robots', content: meta.robots }));
	if (meta.canonical) nodes.push(mkLink({ rel: 'canonical', href: meta.canonical }));
	if (options.showGenerator && render.generator) {
		nodes.push(mkMeta({ name: 'generator', content: render.generator }));
	}

	return nodes;
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
