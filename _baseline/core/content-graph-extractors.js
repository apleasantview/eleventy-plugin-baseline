function extractHeadings(document) {
	const nodes = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

	return Array.from(nodes).map((el) => ({
		level: Number(el.tagName[1]),
		text: (el.textContent || '').trim(),
		id: el.id || null
	}));
}

function extractLinks(document) {
	const anchors = document.querySelectorAll('a[href]');

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

function extractImages(document) {
	const imgs = document.querySelectorAll('img[src]');

	return Array.from(imgs).map((img) => ({
		src: img.getAttribute('src'),
		alt: img.getAttribute('alt') || null
	}));
}

export function extractGraph(document) {
	return {
		text: document.body?.textContent?.trim() ?? null,
		headings: extractHeadings(document),
		links: extractLinks(document),
		images: extractImages(document)
	};
}
