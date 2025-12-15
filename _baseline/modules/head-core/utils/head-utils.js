import Merge from "@11ty/eleventy-utils/src/Merge.js";
import { TemplatePath } from "@11ty/eleventy-utils";

const pick = (...values) => values.find((v) => v !== undefined && v !== null);

const normalizePathPrefix = (pathPrefix = "") => {
	// Align with Eleventy’s normalizeUrlPath behavior
	const normalized = TemplatePath.normalizeUrlPath("/", pathPrefix);
	return normalized === "/" ? "" : normalized; // empty means root
};

const isAbsoluteUrl = (url = "") =>
	/^[a-z][a-z\d+\-.]*:\/\//i.test(url) || url.startsWith("//");

const absoluteUrl = (siteUrl, pathPrefix, url) => {
	if (!url) return url;
	if (isAbsoluteUrl(url)) return url;
	const prefix = normalizePathPrefix(pathPrefix);
	const joined = TemplatePath.normalizeUrlPath(prefix || "/", url);
	return siteUrl ? `${siteUrl.replace(/\/+$/, "")}${joined}` : joined;
};

const mergeBaseHead = (site, user, page, title, description, noindex, url) => {
	return Merge(
		{},
		{
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
				"og:url": url || "",
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
		},
		user
	);
};

const resolveCanonical = (head, page, contentMap, env = {}) => {
	const { siteUrl, pathPrefix = "", pageUrlOverride } = env;
	const explicit = pick(head.canonical);
	if (explicit) return absoluteUrl(siteUrl, pathPrefix, explicit);

	const url = pick(
		pageUrlOverride,
		page?.url,
		page?.inputPath && contentMap?.inputPathToUrl?.[page.inputPath]?.[0]
	);
	if (!url) return undefined;

	return absoluteUrl(siteUrl, pathPrefix, url);
};

const dedupeMeta = (arr = []) => {
	const seen = new Set();
	const out = [];
	for (let i = arr.length - 1; i >= 0; i--) {
		const m = arr[i];
		const key =
			m.charset
				? "charset"
				: m.name
				? `name:${m.name}`
				: m.property
				? `prop:${m.property}`
				: m["http-equiv"]
				? `http:${m["http-equiv"]}`
				: null;
		if (!key || seen.has(key)) continue;
		seen.add(key);
		out.push(m);
	}
	return out.reverse();
};

const dedupeLink = (links = []) => {
	const seen = new Set();
	const out = [];
	for (let i = links.length - 1; i >= 0; i--) {
		const l = links[i];
		const key = l.rel && l.href ? `rel:${l.rel}|${l.href}` : null;
		if (!key || seen.has(key)) continue;
		seen.add(key);
		out.push(l);
	}
	return out.reverse();
};

const flattenHead = (head = {}, canonical) => {
	// base/meta first, keep OG/Twitter last by placing them in a separate meta bucket
	const baseMeta = dedupeMeta([...(head.meta || []), ...(head.miscMeta || [])]);

	const socialMeta = dedupeMeta([
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
	]);

	const link = dedupeLink(
		[
			canonical ? { rel: "canonical", href: canonical } : null,
			...(head.link || []),
			...(head.hreflang || []),
		].filter(Boolean)
	);

	const script = [...(head.script || [])];
	if (head.structuredData) {
		script.unshift({
			type: "application/ld+json",
			content: JSON.stringify(head.structuredData),
		});
	}

	// Key order matters for posthtml-head-elements.
	return {
		meta: baseMeta,
		title: head.title || "",
		link,
		script,
		meta_social: socialMeta,
	};
};

const buildHead = (data = {}, env = {}) => {
	const { userKey = "head", contentMap = {}, siteUrl, pathPrefix } = env;
	const site = data.site || {};
	const user = userKey ? data[userKey] || {} : {};
	const page = data.page || {};
	const resolvedSiteUrl =
		siteUrl ||
		site.url ||
		process.env.URL ||
		process.env.DEPLOY_URL ||
		process.env.DEPLOY_PRIME_URL;

	const title = pick(data.title, user.title, site.title, "");
	const description = pick(data.description, user.description, site.tagline, "");
	const noindex = pick(page.noindex, user.noindex, site.noindex, false);

	const canonical = resolveCanonical(
		{ canonical: absoluteUrl(resolvedSiteUrl, pathPrefix, user.canonical) },
		page,
		contentMap,
		{ ...env, siteUrl: resolvedSiteUrl }
	);
	const merged = mergeBaseHead(site, user, page, title, description, noindex, canonical);
	return flattenHead(merged, canonical);
};

const buildHeadSpec = (context, contentMap, env = {}) => {
	return buildHead(context, { ...env, contentMap });
};

export {
	pick,
	resolveCanonical,
	flattenHead,
	buildHead,
	buildHeadSpec,
	absoluteUrl,
};
