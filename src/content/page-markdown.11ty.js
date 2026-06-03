// Markdown sibling for every content page: <url>/index.md
// Rebuilds the file from page data: flat YAML front matter + body
// (rawInput with the <section> layout wrappers stripped). Nunjucks
// expressions in the body are left unresolved for now — we'll judge
// from output whether to render or rewrite them.

export const data = {
	pagination: {
		data: 'collections.all',
		size: 1,
		alias: 'node'
		// before: (paginationData) => paginationData.filter((p) => p.data?.translationKey)
	},
	permalink: ({ node }) => {
		const url = node.url;

		// Non-rendering source (permalink: false, e.g. data-carrier records):
		// no url, so no markdown sibling. Bail.
		if (!url) return false;

		// Homepage
		if (url === '/') {
			return '/index.md';
		}

		// Directory-style URLs:
		// /fr/ -> /fr/index.md
		// /docs/foo/ -> /docs/foo/index.md
		if (url.endsWith('/')) {
			return `${url}index.md`;
		}

		// Non-directory URLs:
		// /about -> /about.md
		return `${url}.md`;
	},
	eleventyExcludeFromCollections: true,
	baselineExcludeFromGraph: true,
	_internal: true
};

function toYaml(value) {
	if (value instanceof Date) {
		return value.toISOString();
	}

	if (typeof value === 'string') {
		// Multiline strings → block scalar
		if (value.includes('\n')) {
			return `|-\n${value
				.split('\n')
				.map((line) => `  ${line}`)
				.join('\n')}`;
		}

		// Single-line strings
		return `'${value.replace(/'/g, "''")}'`;
	}
	return String(value);
}

function buildFrontMatter(fields) {
	const lines = ['---'];
	for (const [key, value] of Object.entries(fields)) {
		if (value === undefined || value === null) continue;
		lines.push(`${key}: ${toYaml(value)}`);
	}
	lines.push('---');
	return lines.join('\n');
}

export default function ({ node }) {
	const d = node.data;
	const settings = d.settings || {};
	const siteBase = (settings.url || '').replace(/\/+$/, '');

	// Flat front matter: page fields.
	const fields = {
		title: d.title,
		description: d.description,
		slug: d.slug,
		type: d.type,
		date: d.date,
		lang: d.lang,
		translationKey: d.translationKey,
		url: `${siteBase}${node.url}`
	};

	const body = (d.page?.rawInput || '')
		.replace(/<section[^>]*>/g, '')
		.replace(/<\/section>/g, '')
		.replace(/\n{3,}/g, '\n\n')
		.trim();

	return `${buildFrontMatter(fields)}\n\n${body}\n`;
}
