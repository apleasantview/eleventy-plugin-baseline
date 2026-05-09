/**
 * Extractors (runtime substrate)
 *
 * Pulls structured records out of a rendered HTML document. One pure
 * function per concern (headings, links, images, excerpt) plus the
 * boundary rule that decides which root the page-level extract reads.
 *
 * Architecture layer:
 *   runtime substrate
 *
 * System role:
 *   The fixed v1 extractor set called by the graph builder. Side-effect
 *   free; one document in, one record out.
 *
 * Lifecycle:
 *   build-time → buildGraph parses each page and calls extractGraph
 *
 * Why this exists:
 *   Eleventy doesn't expose rendered HTML as data. These extractors give
 *   the cascade something queryable: link graphs, headings, excerpts.
 *
 * Scope:
 *   Owns the per-page extractor shape and the article/main/body boundary
 *   rule.
 *   Does not own backlink inversion (backlinks.js) or origin assembly
 *   (the composition root passes knownOrigins in).
 *
 * Data flow:
 *   parsed document + knownOrigins → per-page record
 */

function extractHeadings(root) {
	const nodes = root.querySelectorAll('h1, h2, h3, h4, h5, h6');

	return Array.from(nodes).map((el) => ({
		level: Number(el.tagName[1]),
		text: (el.textContent || '').trim(),
		id: el.id || null
	}));
}

function extractLinks(root, knownOrigins) {
	const anchors = root.querySelectorAll('a[href]');

	return Array.from(anchors).map((a) => {
		const raw = a.getAttribute('href');
		const href = normaliseHref(raw, knownOrigins);

		return {
			href,
			text: (a.textContent || '').trim(),
			internal: isInternal(href)
		};
	});
}

// HtmlBasePlugin rewrites internal hrefs to absolute URLs at render time
// (using process.env.URL or the dev server origin). Strip a known origin
// so hrefs land back as path-only; leave external URLs alone.
function normaliseHref(href, knownOrigins) {
	if (!href) return href;
	try {
		const url = new URL(href);
		if (knownOrigins?.has(url.origin)) {
			return url.pathname + url.search + url.hash;
		}
		return href;
	} catch {
		return href;
	}
}

function isInternal(href) {
	if (!href) return false;
	return href.startsWith('/') || href.startsWith('#');
}

function extractImages(root) {
	const imgs = root.querySelectorAll('img[src]');

	return Array.from(imgs).map((img) => ({
		src: img.getAttribute('src'),
		alt: img.getAttribute('alt') || null
	}));
}

function extractExcerpt(root, text) {
	const firstP = root.querySelector('p');
	const fromP = firstP?.textContent?.trim();
	if (fromP) return fromP;

	if (!text) return;
	return text.length > 200 ? text.slice(0, 200).trimEnd() + '…' : text;
}

/**
 * Extract per-page records from rendered HTML.
 *
 * Scope rule:
 *   - Single `<article>` inside `<main>` → article is the boundary.
 *     Encourages semantic HTML; keeps chapter TOCs and sibling nav out.
 *   - Multiple `<article>`s (listing pages) → fall back to `<main>`,
 *     because the listing as a whole is the page's content.
 *   - No `<main>` → fall back to `<body>`. Defensive only; a site without
 *     `<main>` is giving up the semantic boundary that makes any of this
 *     meaningful.
 */
export function extractGraph(document, options = {}) {
	const main = document.querySelector('main');
	const articles = main?.querySelectorAll('article') ?? [];
	const root = articles.length === 1 ? articles[0] : (main ?? document.body);

	if (!root) return { text: undefined, excerpt: undefined, headings: [], links: [], images: [] };

	const text = root.textContent?.trim();
	const knownOrigins = options.knownOrigins;

	return {
		text,
		excerpt: extractExcerpt(root, text),
		headings: extractHeadings(root),
		links: extractLinks(root, knownOrigins),
		images: extractImages(root)
	};
}
