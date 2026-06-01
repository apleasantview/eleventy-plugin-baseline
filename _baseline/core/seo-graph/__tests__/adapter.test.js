import { describe, expect, it } from 'vitest';
import { assembleSchemaGraph } from '../adapter.js';

const siteUrl = 'https://www.example.com/';

// Minimal cascade bag. Tests override only the keys whose rule they exercise,
// so each expected value traces to one decision and nothing is incidental.
function bag(overrides = {}) {
	return {
		settings: { url: siteUrl, title: 'Demo Site', defaultLanguage: 'en' },
		page: { url: '/about/' },
		...overrides
	};
}

const byType = (graph, type) => graph.filter((n) => n['@type'] === type);
const one = (graph, type) => byType(graph, type)[0];

/**
 * Independent oracle for the plan's verification gate: walk the assembled graph
 * and return every `{ '@id' }` reference (an object with @id and no @type) that
 * points at no entity in the graph. A correct graph dangles nothing. This is
 * written from the definition of a resolved graph, not copied from the adapter,
 * so a mis-wired ref (publisher pointing at an org we forgot to build) reds it.
 */
function danglingRefs(graph) {
	const ids = new Set(graph.map((n) => n['@id']).filter(Boolean));
	const dangling = [];
	const walk = (value) => {
		if (Array.isArray(value)) return value.forEach(walk);
		if (!value || typeof value !== 'object') return;
		if (typeof value['@id'] === 'string' && value['@type'] === undefined) {
			if (!ids.has(value['@id'])) dangling.push(value['@id']);
			return;
		}
		for (const [k, v] of Object.entries(value)) if (k !== '@id') walk(v);
	};
	for (const entity of graph) for (const [k, v] of Object.entries(entity)) if (k !== '@id') walk(v);
	return dangling;
}

describe('dependency-discovery guard', () => {
	// Contract: Eleventy's proxy pass calls the namespace with siblings still
	// undefined; the adapter must yield nothing rather than throw or half-build.
	it('returns an empty graph when settings.url is missing', () => {
		expect(assembleSchemaGraph({ settings: {}, page: { url: '/x/' } })).toEqual([]);
	});

	it('returns an empty graph when page.url is missing', () => {
		expect(assembleSchemaGraph({ settings: { url: siteUrl }, page: {} })).toEqual([]);
	});
});

describe('identity model (Organization-or-Person, with floor)', () => {
	// Rule: the primary entity is the WebSite publisher — Organization first.
	it('makes a configured Organization the WebSite publisher', () => {
		const graph = assembleSchemaGraph(bag({ schema: { organization: { '@type': 'Organization', name: 'Acme' } } }));
		const website = one(graph, 'WebSite');
		const org = one(graph, 'Organization');
		expect(website.publisher['@id']).toBe(org['@id']);
	});

	// Rule: with no Organization, the Person becomes the primary entity.
	it('falls back to the Person as publisher when only a person is configured', () => {
		const graph = assembleSchemaGraph(bag({ schema: { person: { '@type': 'Person', name: 'Jane' } } }));
		const website = one(graph, 'WebSite');
		const person = one(graph, 'Person');
		expect(byType(graph, 'Organization')).toHaveLength(0);
		expect(website.publisher['@id']).toBe(person['@id']);
	});

	// Rule: a zero-config site still emits a valid publisher — a floor Organization
	// synthesised from settings.title. Its name is our decision, not the library's.
	it('synthesises a floor Organization from settings.title when no identity is configured', () => {
		const graph = assembleSchemaGraph(bag());
		const org = one(graph, 'Organization');
		const website = one(graph, 'WebSite');
		expect(org.name).toBe('Demo Site');
		expect(website.publisher['@id']).toBe(org['@id']);
	});

	// Guard against over-building: no Person node unless one is configured.
	it('builds no Person node when none is configured', () => {
		const graph = assembleSchemaGraph(bag({ schema: { organization: { '@type': 'Organization', name: 'Acme' } } }));
		expect(byType(graph, 'Person')).toHaveLength(0);
	});
});

describe('article', () => {
	const articleBag = (schema) =>
		bag({ schema, type: 'article', page: { url: '/blog/hello/', date: new Date('2026-01-02') }, title: 'Hello' });

	// Rule: the editorial `type` label drives the Article node, nothing else.
	it('builds an Article only when the editorial type is "article"', () => {
		expect(byType(assembleSchemaGraph(articleBag({})), 'Article')).toHaveLength(1);
		expect(byType(assembleSchemaGraph(bag({ type: 'page' })), 'Article')).toHaveLength(0);
	});

	// Rule: author is the Person when present, else the primary entity.
	it('attributes the Article to the Person when one is configured', () => {
		const graph = assembleSchemaGraph(
			articleBag({ organization: { '@type': 'Organization', name: 'Acme' }, person: { '@type': 'Person', name: 'Jane' } })
		);
		expect(one(graph, 'Article').author['@id']).toBe(one(graph, 'Person')['@id']);
	});

	it('attributes the Article to the primary entity when no Person exists', () => {
		const graph = assembleSchemaGraph(articleBag({ organization: { '@type': 'Organization', name: 'Acme' } }));
		expect(one(graph, 'Article').author['@id']).toBe(one(graph, 'Organization')['@id']);
	});
});

describe('no editorial-to-schema bridge', () => {
	// Decision: the old WEBPAGE_TYPE_DEFAULTS bridge is gone. Editorial labels
	// never leak into schema @type; re-adding the bridge would red this.
	it('does not promote editorial type "about" to schema AboutPage', () => {
		const graph = assembleSchemaGraph(bag({ type: 'about' }));
		expect(one(graph, 'WebPage')['@type']).toBe('WebPage');
		expect(byType(graph, 'AboutPage')).toHaveLength(0);
	});

	// Symmetry: pageType is the pure opt-in lever, passed straight to @type.
	it('honours an explicit pageType override', () => {
		const graph = assembleSchemaGraph(bag({ pageType: 'AboutPage' }));
		expect(byType(graph, 'WebPage')).toHaveLength(0);
		expect(one(graph, 'AboutPage')).toBeTruthy();
	});

	it('honours an explicit articleType override', () => {
		const graph = assembleSchemaGraph(
			bag({ type: 'article', articleType: 'BlogPosting', page: { url: '/b/' }, title: 'B' })
		);
		expect(one(graph, 'BlogPosting')).toBeTruthy();
		expect(byType(graph, 'Article')).toHaveLength(0);
	});
});

describe('image degrade (two-tier)', () => {
	// Rule: an ImageObject node needs real pixel dimensions; with them present
	// the WebPage gains a primaryImageOfPage ref to that node.
	it('emits an ImageObject node and primaryImageOfPage ref when dimensions are known', () => {
		const graph = assembleSchemaGraph(
			bag({ settings: { url: siteUrl, title: 'Demo', seo: { ogImage: { url: '/og.png', width: 1200, height: 630 } } } })
		);
		const image = one(graph, 'ImageObject');
		expect(image).toBeTruthy();
		expect(one(graph, 'WebPage').primaryImageOfPage['@id']).toBe(image['@id']);
	});

	// Rule: a bare-path image (no dimensions) yields no node and no ref — the
	// url-only og:image lives in the OG projection (3b), not the graph.
	it('omits the ImageObject node when the image has no dimensions', () => {
		const graph = assembleSchemaGraph(
			bag({ settings: { url: siteUrl, title: 'Demo', seo: { ogImage: '/og.png' } } })
		);
		expect(byType(graph, 'ImageObject')).toHaveLength(0);
		expect(one(graph, 'WebPage').primaryImageOfPage).toBeUndefined();
	});
});

describe('schema.pieces seam', () => {
	// Contract: pieces are pass-through. A node with a field a validator would
	// reject must survive verbatim — proving the adapter coerces nothing.
	it('passes author-supplied pieces into the graph untouched', () => {
		const piece = { '@type': 'Service', '@id': `${siteUrl}#service`, name: 'Consulting', madeUpField: 42 };
		const graph = assembleSchemaGraph(bag({ schema: { pieces: [piece] } }));
		expect(graph).toContainEqual(piece);
	});
});

describe('translations', () => {
	// Rule: workTranslation links navigator siblings sharing a translationKey,
	// excludes the current page, and ignores unrelated keys.
	it('links siblings sharing a translationKey and excludes self and unrelated pages', () => {
		const graph = assembleSchemaGraph(
			bag({
				page: { url: '/about/', lang: 'en' },
				_navigator: {
					nodes: {
						'/about/': { url: '/about/', translationKey: 'about', lang: 'en' },
						'/nl/over/': { url: '/nl/over/', translationKey: 'about', lang: 'nl' },
						'/contact/': { url: '/contact/', translationKey: 'contact', lang: 'en' }
					}
				}
			})
		);
		const urls = one(graph, 'WebPage').workTranslation.map((t) => t.url);
		expect(urls).toEqual(['https://www.example.com/nl/over/']);
	});
});

describe('graph integrity (verification gate)', () => {
	// The plan's gate: every page carries a complete, ref-resolved graph. The
	// oracle is independent of the adapter, so any broken @id wiring reds here.
	it('produces no dangling references for a fully configured page', () => {
		const graph = assembleSchemaGraph(
			bag({
				schema: {
					organization: { '@type': 'Organization', name: 'Acme', logo: { url: '/logo.png', width: 512, height: 512 } },
					person: { '@type': 'Person', name: 'Jane', url: 'https://www.example.com/about/' },
					pieces: [{ '@type': 'Service', '@id': `${siteUrl}#service`, name: 'Consulting' }]
				},
				type: 'article',
				sectionLabel: 'Blog',
				page: { url: '/blog/hello/', date: new Date('2026-01-02'), lang: 'en' },
				title: 'Hello',
				description: 'A post',
				settings: { url: siteUrl, title: 'Acme', seo: { ogImage: { url: '/og.png', width: 1200, height: 630 } } },
				_navigator: {
					nodes: {
						'/blog/hello/': { url: '/blog/hello/', section: ['blog'], translationKey: 'hello', lang: 'en' },
						'/nl/blog/hallo/': { url: '/nl/blog/hallo/', section: ['blog'], translationKey: 'hello', lang: 'nl' }
					}
				}
			})
		);
		expect(danglingRefs(graph)).toEqual([]);
	});

	// The zero-config floor must also resolve: the synthesised publisher is a
	// real node, not a dangling ref.
	it('produces no dangling references for a zero-config page', () => {
		expect(danglingRefs(assembleSchemaGraph(bag()))).toEqual([]);
	});
});
