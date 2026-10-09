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

// The fold runs in the same plugin, after the placeholder has become a real
// <head>. A richer fake tree is needed because it walks the <html> node rather
// than matching the placeholder, so this harness answers both selectors.
//
// Why this exists at all: the escape hatch puts metadata tags below the
// placeholder, browsers fold them back into the head, and the file on disk did
// not. Excellent's output folded only because its WebC plugin re-parses every
// page with parse5; a project without WebC shipped the strays outside <head>.
function runDocument(strays, seeds = makeSeeds()) {
	const plugin = renderHead({
		seeds,
		seo: undefined,
		alternates: [],
		options: {},
		placeholderTag: PLACEHOLDER,
		eol: EOL
	});

	const body = { tag: 'body', content: ['page'] };
	const html = { tag: 'html', content: [EOL, { tag: PLACEHOLDER }, EOL, ...strays, body, EOL] };

	const tree = {
		match(expr, cb) {
			if (expr.tag === PLACEHOLDER) {
				const i = html.content.findIndex((n) => n?.tag === PLACEHOLDER);
				if (i !== -1) html.content[i] = cb(html.content[i]);
			} else if (expr.tag === 'html') {
				cb(html);
			}
			return tree;
		}
	};

	plugin(tree);
	return html;
}

const headOf = (html) => html.content.find((n) => n?.tag === 'head');
const strandedOf = (html) => {
	const h = html.content.findIndex((n) => n?.tag === 'head');
	const b = html.content.findIndex((n) => n?.tag === 'body');
	return html.content.slice(h + 1, b).filter((n) => n?.tag);
};

describe('folding stranded head siblings', () => {
	it('moves metadata siblings into the head', () => {
		const html = runDocument([
			{ tag: 'link', attrs: { rel: 'stylesheet', href: '/a.css' } },
			EOL,
			{ tag: 'script', attrs: { src: '/a.js', type: 'module' } }
		]);

		const tags = headOf(html).content.filter((n) => n?.tag);
		expect(tags.some((n) => n.tag === 'link' && n.attrs?.href === '/a.css')).toBe(true);
		expect(tags.some((n) => n.tag === 'script' && n.attrs?.src === '/a.js')).toBe(true);
		expect(strandedOf(html)).toEqual([]);
	});

	it('appends rather than sorting, because the hatch is documented as unsorted', () => {
		const html = runDocument([{ tag: 'meta', attrs: { name: 'stray' } }]);
		const tags = headOf(html).content.filter((n) => n?.tag);
		expect(tags.at(-1)).toEqual({ tag: 'meta', attrs: { name: 'stray' } });
	});

	it('keeps the relative order of the tags it folds', () => {
		const html = runDocument([
			{ tag: 'meta', attrs: { name: 'first' } },
			{ tag: 'meta', attrs: { name: 'second' } }
		]);
		const names = headOf(html)
			.content.filter((n) => n?.tag === 'meta' && n.attrs?.name?.match(/first|second/))
			.map((n) => n.attrs.name);
		expect(names).toEqual(['first', 'second']);
	});

	it('leaves a non-metadata stray where it sits', () => {
		const html = runDocument([{ tag: 'div', attrs: { id: 'oops' } }]);
		expect(strandedOf(html)).toEqual([{ tag: 'div', attrs: { id: 'oops' } }]);
		expect(headOf(html).content.some((n) => n?.tag === 'div')).toBe(false);
	});

	it('folds the metadata and leaves the rest, when both are present', () => {
		const html = runDocument([{ tag: 'div' }, { tag: 'meta', attrs: { name: 'stray' } }]);
		expect(strandedOf(html)).toEqual([{ tag: 'div' }]);
		expect(headOf(html).content.some((n) => n?.tag === 'meta' && n.attrs?.name === 'stray')).toBe(true);
	});

	it('does nothing when there is nothing stranded', () => {
		const html = runDocument([]);
		const before = headOf(html).content.length;
		expect(strandedOf(html)).toEqual([]);
		expect(headOf(html).content.length).toBe(before);
	});

	it('leaves the tree alone when there is no body', () => {
		const plugin = renderHead({
			seeds: makeSeeds(),
			alternates: [],
			options: {},
			placeholderTag: PLACEHOLDER,
			eol: EOL
		});
		const stray = { tag: 'meta', attrs: { name: 'stray' } };
		const html = { tag: 'html', content: [{ tag: PLACEHOLDER }, stray] };
		const tree = {
			match(expr, cb) {
				if (expr.tag === PLACEHOLDER) html.content[0] = cb(html.content[0]);
				else if (expr.tag === 'html') cb(html);
				return tree;
			}
		};
		plugin(tree);

		expect(html.content.at(-1)).toBe(stray);
		expect(headOf(html).content.some((n) => n?.tag === 'meta' && n.attrs?.name === 'stray')).toBe(false);
	});
});
