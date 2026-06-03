import { describe, expect, it } from 'vitest';
import { renderHead } from '../drivers/posthtml-head-elements.js';

// renderHead returns a PostHTML plugin `(tree) => tree` that replaces the
// placeholder element with a <head> whose children are the emitted nodes.
// We drive it with a minimal fake tree that captures the replacement, rather
// than importing posthtml (a transitive dep we deliberately don't declare).
// This exercises our emit/dedupe/sort logic, not posthtml's tree-walking.
const PLACEHOLDER = 'baseline-head';
const EOL = '\n';

function runHead(seeds, { seo, alternates = [], options = {} } = {}) {
	const plugin = renderHead({ seeds, seo, alternates, options, placeholderTag: PLACEHOLDER, eol: EOL });
	let replacement;
	const tree = {
		match(expr, cb) {
			if (expr.tag === PLACEHOLDER) replacement = cb({ tag: PLACEHOLDER });
			return tree;
		}
	};
	plugin(tree);
	return replacement;
}

// Emitted nodes with the interleaved EOL separators stripped back out.
function nodesOf(replacement) {
	return replacement.content.filter((n) => n !== EOL);
}

function makeSeeds({ meta = {}, render = {}, head } = {}) {
	return { meta: { robots: 'index, follow', ...meta }, render, head };
}

const metaByName = (nodes, name) => nodes.filter((n) => n.tag === 'meta' && n.attrs?.name === name);
const metaByProp = (nodes, property) => nodes.filter((n) => n.tag === 'meta' && n.attrs?.property === property);
const linksByRel = (nodes, rel) => nodes.filter((n) => n.tag === 'link' && n.attrs?.rel === rel);

describe('renderHead', () => {
	it('replaces the placeholder with a <head> element', () => {
		const out = runHead(makeSeeds());
		expect(out.tag).toBe('head');
	});

	it('always emits charset and viewport', () => {
		const nodes = nodesOf(runHead(makeSeeds()));
		expect(nodes.some((n) => n.tag === 'meta' && n.attrs?.charset === 'UTF-8')).toBe(true);
		expect(metaByName(nodes, 'viewport')).toHaveLength(1);
	});

	it('always emits robots', () => {
		const nodes = nodesOf(runHead(makeSeeds({ meta: { robots: 'noindex, nofollow' } })));
		expect(metaByName(nodes, 'robots')[0].attrs.content).toBe('noindex, nofollow');
	});

	it('omits title, description, and canonical when not provided', () => {
		const nodes = nodesOf(runHead(makeSeeds()));
		expect(nodes.some((n) => n.tag === 'title')).toBe(false);
		expect(metaByName(nodes, 'description')).toHaveLength(0);
		expect(linksByRel(nodes, 'canonical')).toHaveLength(0);
	});

	it('emits title, description, and canonical when provided', () => {
		// title/description ride the page-context meta; canonical comes from the seo handle.
		const nodes = nodesOf(
			runHead(makeSeeds({ meta: { title: 'Hello', description: 'World' } }), {
				seo: { url: 'https://www.example.com/p/' }
			})
		);
		expect(nodes.find((n) => n.tag === 'title').content).toEqual(['Hello']);
		expect(metaByName(nodes, 'description')[0].attrs.content).toBe('World');
		expect(linksByRel(nodes, 'canonical')[0].attrs.href).toBe('https://www.example.com/p/');
	});

	it('gates the generator meta on showGenerator and a generator value', () => {
		const withGen = makeSeeds({ render: { generator: 'Eleventy' } });
		// off by default
		expect(metaByName(nodesOf(runHead(withGen)), 'generator')).toHaveLength(0);
		// on when both the flag and a value are present
		expect(
			metaByName(nodesOf(runHead(withGen, { options: { showGenerator: true } })), 'generator')[0].attrs.content
		).toBe('Eleventy');
		// flag on but nothing to show
		const noValue = makeSeeds({ render: {} });
		expect(metaByName(nodesOf(runHead(noValue, { options: { showGenerator: true } })), 'generator')).toHaveLength(0);
	});

	it('layers user head extras: meta, link, script, style', () => {
		const nodes = nodesOf(
			runHead(
				makeSeeds({
					head: {
						meta: [{ name: 'theme-color', content: '#fff' }],
						link: [{ rel: 'preconnect', href: 'https://fonts.example.com' }],
						script: [{ src: '/a.js', defer: true }],
						style: [{ content: 'body{}' }]
					}
				})
			)
		);
		expect(metaByName(nodes, 'theme-color')).toHaveLength(1);
		expect(linksByRel(nodes, 'preconnect')[0].attrs.href).toBe('https://fonts.example.com');
		expect(nodes.find((n) => n.tag === 'script')?.attrs.src).toBe('/a.js');
		expect(nodes.find((n) => n.tag === 'style')?.content).toEqual(['body{}']);
	});

	it('emits hreflang alternates as link elements', () => {
		const nodes = nodesOf(
			runHead(makeSeeds(), {
				alternates: [{ rel: 'alternate', hreflang: 'nl', href: 'https://www.example.com/nl/' }]
			})
		);
		const alt = linksByRel(nodes, 'alternate')[0];
		expect(alt.attrs.hreflang).toBe('nl');
		expect(alt.attrs.href).toBe('https://www.example.com/nl/');
	});

	it('drops a user-supplied canonical link so it cannot duplicate the real one', () => {
		const nodes = nodesOf(
			runHead(makeSeeds({ head: { link: [{ rel: 'canonical', href: 'https://wrong.example.com/' }] } }), {
				seo: { url: 'https://www.example.com/p/' }
			})
		);
		const canonicals = linksByRel(nodes, 'canonical');
		expect(canonicals).toHaveLength(1);
		expect(canonicals[0].attrs.href).toBe('https://www.example.com/p/');
	});

	it('collapses a duplicated meta, last value winning', () => {
		// The default description and a user override share name:description.
		const nodes = nodesOf(
			runHead(
				makeSeeds({
					meta: { description: 'default' },
					head: { meta: [{ name: 'description', content: 'override' }] }
				})
			)
		);
		const descriptions = metaByName(nodes, 'description');
		expect(descriptions).toHaveLength(1);
		expect(descriptions[0].attrs.content).toBe('override');
	});

	it('collapses duplicate links by rel + href', () => {
		const nodes = nodesOf(
			runHead(
				makeSeeds({
					head: {
						link: [
							{ rel: 'preconnect', href: 'https://fonts.example.com' },
							{ rel: 'preconnect', href: 'https://fonts.example.com' }
						]
					}
				})
			)
		);
		expect(linksByRel(nodes, 'preconnect')).toHaveLength(1);
	});

	// --- seo substrate emission (bar 4) ---

	it('emits OG and Twitter tags from the seo projection', () => {
		const nodes = nodesOf(
			runHead(makeSeeds(), {
				seo: {
					openGraph: { title: 'Page', type: 'website', locale: 'en_US' },
					twitter: { card: 'summary_large_image' }
				}
			})
		);
		expect(metaByProp(nodes, 'og:title')[0].attrs.content).toBe('Page');
		expect(metaByProp(nodes, 'og:type')[0].attrs.content).toBe('website');
		expect(metaByName(nodes, 'twitter:card')[0].attrs.content).toBe('summary_large_image');
	});

	it('sources canonical from seo.url, the cascade-resolved value', () => {
		// seo.url is the source: it is used even when the seed carries a different one.
		const nodes = nodesOf(
			runHead(makeSeeds({ meta: { canonical: 'https://www.example.com/seed/' } }), {
				seo: { url: 'https://www.example.com/resolved/' }
			})
		);
		expect(linksByRel(nodes, 'canonical')).toHaveLength(1);
		expect(linksByRel(nodes, 'canonical')[0].attrs.href).toBe('https://www.example.com/resolved/');
	});

	it('emits no canonical when the seo layer suppressed it (noindex / no settings.url)', () => {
		// Handle present but seo.url undefined: the seo layer dropped the canonical
		// on purpose. The driver must not resurrect it from the page-context seed.
		const nodes = nodesOf(
			runHead(makeSeeds({ meta: { canonical: 'https://www.example.com/seed/' } }), {
				seo: { openGraph: { title: 'Noindexed' } }
			})
		);
		expect(linksByRel(nodes, 'canonical')).toHaveLength(0);
	});

	it('emits repeated og:locale:alternate without collapsing them (non-deduped path)', () => {
		const nodes = nodesOf(
			runHead(makeSeeds(), {
				seo: { openGraph: { title: 'Home', localeAlternate: ['fr_FR', 'nl_NL'] } }
			})
		);
		const alternates = metaByProp(nodes, 'og:locale:alternate').map((n) => n.attrs.content);
		expect(alternates).toEqual(['fr_FR', 'nl_NL']);
	});

	it('emits repeated article:author without collapsing them', () => {
		const nodes = nodesOf(
			runHead(makeSeeds(), {
				seo: { openGraph: { title: 'Post', type: 'article', article: { authors: ['Ada', 'Grace'] } } }
			})
		);
		expect(metaByProp(nodes, 'article:author').map((n) => n.attrs.content)).toEqual(['Ada', 'Grace']);
	});

	it('emits repeated article:tag without collapsing them', () => {
		const nodes = nodesOf(
			runHead(makeSeeds(), {
				seo: { openGraph: { title: 'Post', type: 'article', article: { tags: ['eleventy', 'seo'] } } }
			})
		);
		expect(metaByProp(nodes, 'article:tag').map((n) => n.attrs.content)).toEqual(['eleventy', 'seo']);
	});

	it('emits the JSON-LD graph wrapped in its @context envelope', () => {
		const graph = [{ '@type': 'WebSite', '@id': 'https://www.example.com/#/schema.org/WebSite' }];
		const nodes = nodesOf(runHead(makeSeeds(), { seo: { schema: graph } }));
		const script = nodes.find((n) => n.tag === 'script' && n.attrs?.type === 'application/ld+json');
		expect(script).toBeTruthy();
		expect(JSON.parse(script.content[0])).toEqual({ '@context': 'https://schema.org', '@graph': graph });
	});

	it('emits no JSON-LD script when the graph is empty', () => {
		const nodes = nodesOf(runHead(makeSeeds(), { seo: { schema: [] } }));
		expect(nodes.some((n) => n.tag === 'script' && n.attrs?.type === 'application/ld+json')).toBe(false);
	});

	it('lets the seo projection win a property collision with settings.head', () => {
		const nodes = nodesOf(
			runHead(makeSeeds({ head: { meta: [{ property: 'og:title', content: 'from settings.head' }] } }), {
				seo: { openGraph: { title: 'from seo' } }
			})
		);
		const titles = metaByProp(nodes, 'og:title');
		expect(titles).toHaveLength(1);
		expect(titles[0].attrs.content).toBe('from seo');
	});

	// Coarse invariant only: capo.js owns the exact weights, so we assert that
	// a critical element (charset) is hoisted ahead of an injected script,
	// not a precise ordering we'd have to re-derive from the library.
	it('capo-sorts critical elements ahead of injected scripts', () => {
		const nodes = nodesOf(
			runHead(makeSeeds({ meta: { title: 'Hello' }, head: { script: [{ src: '/a.js' }] } }))
		);
		const charsetIdx = nodes.findIndex((n) => n.tag === 'meta' && n.attrs?.charset);
		const scriptIdx = nodes.findIndex((n) => n.tag === 'script');
		expect(charsetIdx).toBeGreaterThanOrEqual(0);
		expect(charsetIdx).toBeLessThan(scriptIdx);
	});
});
