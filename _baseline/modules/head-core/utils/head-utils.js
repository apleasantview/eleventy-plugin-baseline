import Merge from "@11ty/eleventy-utils/src/Merge.js";

const pick = (...values) => values.find((v) => v !== undefined && v !== null);

const defaultHead = (data = {}, userKey) => {
	const site = data.site || {};
	const user = userKey ? data[userKey] || {} : {};
	const root = data || {};

	const title = pick(root.title, user.title, site.title, "");
	const description = pick(root.description, user.description, site.tagline, "");
	const noindex = pick(root.noindex, user.noindex, site.noindex, false);

	const base = {
		title,
		meta: [
			{ charset: "UTF-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1.0" },
			{ name: "description", content: description },
			{ name: "robots", content: noindex ? "noindex, nofollow" : "index, follow" },
		],
		link: [],
		openGraph: {
			"og:title": title,
			"og:description": description,
			"og:type": "website",
			"og:url": "",
			"og:image": "",
		},
		twitter: {
			"twitter:card": "summary_large_image",
			"twitter:title": title,
			"twitter:description": description,
			"twitter:image": "",
		},
		structuredData: null,
		miscMeta: [],
		hreflang: [],
		scripts: [],
	};

	// Merge objects (arrays are replaced), then manually concat arrays to keep defaults + user
	const merged = Merge({}, base, user);
	merged.meta = [...(base.meta || []), ...(user.meta || [])];
	merged.link = [...(base.link || []), ...(user.link || [])];
	merged.miscMeta = [...(base.miscMeta || []), ...(user.miscMeta || [])];
	merged.hreflang = [...(base.hreflang || []), ...(user.hreflang || [])];
	merged.scripts = [...(base.scripts || []), ...(user.scripts || [])];

	return merged;
};

const resolveCanonical = (head, page, contentMap) => {
	const explicit = pick(head.canonical);
	if (explicit) return explicit;

	const url = pick(page?.url, page?.inputPath && contentMap?.inputPathToUrl?.[page.inputPath]?.[0]);
	if (!url) return undefined;

	return url;
};

const flattenHead = (head = {}, canonical) => {
	const meta = [
		...(head.meta || []),
		...(head.miscMeta || []),
		...(head.openGraph
			? Object.entries(head.openGraph)
				.filter(([, v]) => v)
				.map(([k, v]) => ({ property: k, content: v }))
			: []),
		...(head.twitter
			? Object.entries(head.twitter)
				.filter(([, v]) => v)
				.map(([k, v]) => ({ name: k, content: v }))
			: []),
	];

	// Deduplicate meta: last occurrence wins per name/property key
	const seen = new Set();
	const dedupedMeta = [];
	for (let i = meta.length - 1; i >= 0; i--) {
		const m = meta[i];
		const key = m.name ? `name:${m.name}` : m.property ? `prop:${m.property}` : null;
		if (!key) continue;
		if (seen.has(key)) continue;
		seen.add(key);
		dedupedMeta.push(m);
	}
	dedupedMeta.reverse();

	const link = [...(head.link || [])];
	if (canonical) {
		link.unshift({ rel: "canonical", href: canonical });
	}
	if (head.hreflang?.length) {
		link.push(...head.hreflang);
	}

	const script = [...(head.scripts || [])];
	if (head.structuredData) {
		script.unshift({
			type: "application/ld+json",
			content: JSON.stringify(head.structuredData),
		});
	}

	return {
		title: head.title || "",
		meta: dedupedMeta,
		link,
		script,
	};
};

const buildHeadSpec = (context, contentMap) => {
	const page = context.page || {};
	const head = page.head || defaultHead({});

	const canonical = resolveCanonical(head, page, contentMap);
	return flattenHead(head, canonical);
};

export {
	pick,
	defaultHead,
	resolveCanonical,
	flattenHead,
	buildHeadSpec,
};

