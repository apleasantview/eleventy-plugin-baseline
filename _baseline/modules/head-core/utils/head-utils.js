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
		script: [],
		hreflang: [],
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
		miscMeta: [],
		structuredData: null,
	};

	// Merge objects (arrays are replaced), then manually concat arrays to keep defaults + user
	const merged = Merge({}, base, user);
	merged.meta = [...(base.meta || []), ...(user.meta || [])];
	merged.link = [...(base.link || []), ...(user.link || [])];
	merged.script = [...(base.script || []), ...(user.script || [])];
	merged.hreflang = [...(base.hreflang || []), ...(user.hreflang || [])];
	merged.miscMeta = [...(base.miscMeta || []), ...(user.miscMeta || [])];

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
	const meta = [...(head.meta || [])];

	const meta_1 = [
		...(head.openGraph
			? Object.entries(head.openGraph)
				.filter(([, v]) => v)
				.map(([k, v]) => ({ property: k, content: v }))
			: [])
	];

	const meta_2 = [
		...(head.twitter
			? Object.entries(head.twitter)
				.filter(([, v]) => v)
				.map(([k, v]) => ({ name: k, content: v }))
			: [])
	];

	const meta_3 = [...(head.miscMeta || [])];

	// Deduplicate meta: last occurrence wins per name/property key
	const dedupe = (arr) => {
		const seen = new Set();
		const out = [];
		for (let i = arr.length - 1; i >= 0; i--) {
			const m = arr[i];
			const key = 
			m.charset
			? "charset"
			:m.name
			? `name:${m.name}`
			: m.property
			? `prop:${m.property}`
			: null;
			if (!key) continue;
			if (seen.has(key)) continue;
			seen.add(key);
			out.push(m);
		}
		return out.reverse();
	}

	const link = [...(head.link || [])];
	if (canonical) {
		link.unshift({ rel: "canonical", href: canonical });
	}
	if (head.hreflang?.length) {
		link.push(...head.hreflang);
	}

	const script = [...(head.script || [])];
	if (head.structuredData) {
		script.unshift({
			type: "application/ld+json",
			content: JSON.stringify(head.structuredData),
		});
	}

	return {
		meta: dedupe(meta),
		title: head.title || "",
		link,
		script,
		meta_1: dedupe(meta_1),
		meta_2: dedupe(meta_2),
		meta_3: dedupe(meta_3),
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

