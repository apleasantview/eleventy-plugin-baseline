function extractHeadings(root) {
	const nodes = root.querySelectorAll('h1, h2, h3, h4, h5, h6');

	return Array.from(nodes).map((el) => ({
		level: Number(el.tagName[1]),
		text: (el.textContent || '').trim(),
		id: el.id || null
	}));
}

function extractLinks(root) {
	const anchors = root.querySelectorAll('a[href]');

	return Array.from(anchors).map((a) => {
		const href = a.getAttribute('href');

		return {
			href,
			text: (a.textContent || '').trim(),
			internal: isInternal(href)
		};
	});
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

	if (!text) return null;
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
export function extractGraph(document) {
	const main = document.querySelector('main');
	const articles = main?.querySelectorAll('article') ?? [];
	const root = articles.length === 1 ? articles[0] : (main ?? document.body);

	if (!root) return { text: null, excerpt: null, headings: [], links: [], images: [] };

	const text = root.textContent?.trim() ?? null;

	return {
		text,
		excerpt: extractExcerpt(root, text),
		headings: extractHeadings(root),
		links: extractLinks(root),
		images: extractImages(root)
	};
}
