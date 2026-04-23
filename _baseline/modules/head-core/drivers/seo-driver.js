import { getWeight, ElementWeights } from '@rviscomi/capo.js';
import { capoPosthtmlAdapter as adapter } from './capo-posthtml-adapter.js';
import { pick, absoluteUrl, stripQuery, dedupeMeta, dedupeLink, dedupeSocialMeta } from '../utils/head-utils.js';

/**
 * The SEO driver: single-pass, seeds-in / nodes-out pipeline for a page's
 * <head> contents. Called once per HTML output by the head-core PostHTML
 * transform. Composes scalar SEO fields, resolves canonical (with query
 * strip and noindex suppression), emits PostHTML nodes for the defaults,
 * settings.head extras, OG and Twitter blocks, dedupes, capo-sorts, and
 * injects in place of the <baseline-head> placeholder.
 *
 * @param {Object} options
 * @param {Object} options.seeds - Raw field bag from page._seo. Keys:
 *   siteTitle, siteTagline, siteUrl, siteNoindex, settingsSeo,
 *   settingsHead, bareTitle, bareDescription, bareNoindex, bareCanonical,
 *   pageSeo.
 * @param {Object} options.page - Eleventy page object (url, inputPath).
 * @param {Object} options.contentMap - { inputPathToUrl, urlToInputPath }.
 * @param {string} [options.siteUrl] - Plugin-option override; falls back to seeds.siteUrl.
 * @param {string} [options.pathPrefix]
 * @param {string} [options.headElementsTag='baseline-head']
 * @param {string} [options.EOL='\n']
 * @param {Object} [options.log] - Logger from core/logging.
 * @returns {Function} PostHTML plugin.
 */
export default function seoDriver(options = {}) {
	const {
		seeds = {},
		page = {},
		contentMap = {},
		siteUrl: siteUrlOption,
		pathPrefix = '',
		headElementsTag = 'baseline-head',
		EOL = '\n',
		log
	} = options;

	const {
		siteTitle = '',
		siteTagline = '',
		siteUrl: seedSiteUrl,
		siteNoindex = false,
		settingsSeo = {},
		settingsHead = {},
		bareTitle,
		bareDescription,
		bareNoindex,
		bareCanonical,
		pageSeo = {}
	} = seeds;

	const siteUrl =
		siteUrlOption || seedSiteUrl || process.env.URL || process.env.DEPLOY_URL || process.env.DEPLOY_PRIME_URL;

	// ── Scalar SEO fields: last-wins along defaults → page bare → page seo.
	const rawTitle = pick(pageSeo.title, bareTitle, '');
	const title = rawTitle ? (siteTitle && rawTitle !== siteTitle ? `${rawTitle} | ${siteTitle}` : rawTitle) : siteTitle;

	const description = pick(pageSeo.description, bareDescription, siteTagline, '');

	// noindex: site-wide kill switch wins. Otherwise page.seo > bare > false.
	const noindex = siteNoindex === true ? true : pick(pageSeo.noindex, bareNoindex, false);

	// Canonical: explicit > page.url fallback. Omitted entirely when noindex.
	const explicitCanonical = pick(pageSeo.canonical, bareCanonical);
	const rawCanonical =
		explicitCanonical || pick(page.url, page.inputPath && contentMap?.inputPathToUrl?.[page.inputPath]?.[0]);
	const canonical = noindex
		? undefined
		: rawCanonical
			? stripQuery(absoluteUrl(siteUrl, pathPrefix, rawCanonical))
			: undefined;

	// OG / Twitter scalars — inherit from resolved title/description.
	const ogTitle = pick(pageSeo.ogTitle, title);
	const ogDescription = pick(pageSeo.ogDescription, description);
	const ogType = pick(pageSeo.ogType, 'website');
	const ogImageRaw = pick(pageSeo.ogImage, settingsSeo.ogImage);
	const ogImage = ogImageRaw ? absoluteUrl(siteUrl, pathPrefix, ogImageRaw) : undefined;

	const twitterCard = pick(pageSeo.twitterCard, 'summary_large_image');
	const twitterSite = pick(pageSeo.twitterSite, settingsSeo.twitterSite);
	const twitterTitle = pick(pageSeo.twitterTitle, ogTitle);
	const twitterDescription = pick(pageSeo.twitterDescription, ogDescription);
	const twitterImage = pick(pageSeo.twitterImage, ogImage);

	// ── Build nodes.
	const nodes = [];

	nodes.push(mkMeta({ charset: 'UTF-8' }));
	nodes.push(mkMeta({ name: 'viewport', content: 'width=device-width, initial-scale=1.0' }));
	if (description) nodes.push(mkMeta({ name: 'description', content: description }));
	nodes.push(
		mkMeta({
			name: 'robots',
			content: noindex
				? 'noindex, nofollow'
				: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'
		})
	);

	if (title) nodes.push({ tag: 'title', content: [title] });

	if (canonical) nodes.push(mkLink({ rel: 'canonical', href: canonical }));

	for (const link of asArray(settingsHead.link)) nodes.push(mkLink(link));
	for (const style of asArray(settingsHead.style)) nodes.push(mkStyle(style));
	for (const script of asArray(settingsHead.script)) nodes.push(mkScript(script));
	for (const meta of asArray(settingsHead.meta)) nodes.push(mkMeta(meta));

	const ogProps = [
		['og:title', ogTitle],
		['og:description', ogDescription],
		['og:type', ogType],
		['og:url', canonical],
		['og:image', ogImage]
	];
	for (const [property, content] of ogProps) {
		if (content) nodes.push(mkMeta({ property, content }));
	}

	const twitterPairs = [
		['twitter:card', twitterCard],
		['twitter:site', twitterSite],
		['twitter:title', twitterTitle],
		['twitter:description', twitterDescription],
		['twitter:image', twitterImage]
	];
	for (const [name, content] of twitterPairs) {
		if (content) nodes.push(mkMeta({ name, content }));
	}

	const deduped = dedupeAll(nodes);
	const sorted = capoSort(deduped);

	return function seoDriverPlugin(tree) {
		if (log) log.info('injecting head elements for', page.inputPath || page.outputPath);
		tree.match({ tag: headElementsTag }, () => ({
			tag: false,
			content: interleaveEOL(sorted, EOL)
		}));
		return tree;
	};
}

// ── Node-shape helpers (lifted from the retired posthtml-head-elements driver).

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

// ── Dedupe across the composed node list.
// - meta (by charset / name / property / http-equiv), last-wins
// - link (by rel+href), last-wins
// - other tags pass through in order
function dedupeAll(nodes) {
	const metas = [];
	const links = [];
	const others = [];
	for (const n of nodes) {
		if (n.tag === 'meta') metas.push(n.attrs || {});
		else if (n.tag === 'link') links.push(n.attrs || {});
		else others.push(n);
	}
	const dedupedMetas = dedupeSocialMeta(dedupeMeta(metas)).map(mkMeta);
	const dedupedLinks = dedupeLink(links).map(mkLink);
	return [...dedupedMetas, ...dedupedLinks, ...others];
}

// Capo stable sort: descending by weight, preserving input order within equal weights.
function capoSort(nodes) {
	const weighted = nodes.map((node, i) => ({
		node,
		i,
		weight: adapter.isElement(node) ? getWeight(node, adapter) : ElementWeights.OTHER
	}));
	weighted.sort((a, b) => b.weight - a.weight || a.i - b.i);
	return weighted.map((w) => w.node);
}

function interleaveEOL(nodes, eol) {
	const out = [];
	for (const n of nodes) {
		out.push(n, eol);
	}
	return out;
}
