import { describe, expect, it } from 'vitest';
import { buildSocialProjections } from '../open-graph.js';

const siteUrl = 'https://www.example.com/';
const canonical = 'https://www.example.com/about/';

// Minimal cascade bag. Tests override only the keys whose rule they exercise,
// so each expected value traces to one decision and nothing is incidental. The
// second argument is the resolved canonical build.js hands in.
function bag(overrides = {}) {
	return {
		settings: { url: siteUrl, title: 'Demo Site', defaultLanguage: 'en' },
		page: { url: '/about/' },
		...overrides
	};
}

describe('dependency-discovery guard', () => {
	// Contract: the proxy pass calls the namespace with siblings still
	// undefined; the projections must be empty rather than half-built.
	it('returns empty projections when settings.url is missing', () => {
		expect(buildSocialProjections({ settings: {}, page: { url: '/x/' } })).toEqual({ openGraph: {}, twitter: {} });
	});

	it('returns empty projections when page.url is missing', () => {
		expect(buildSocialProjections({ settings: { url: siteUrl }, page: {} })).toEqual({ openGraph: {}, twitter: {} });
	});
});

describe('defaults', () => {
	// Rule: a site that configures nothing still gets valid tags.
	it('defaults og:type to website and twitter:card to summary_large_image', () => {
		const { openGraph, twitter } = buildSocialProjections(bag({ title: 'About' }), canonical);
		expect(openGraph.type).toBe('website');
		expect(twitter.card).toBe('summary_large_image');
	});

	it('honours site-level openGraph.type and twitter.card defaults', () => {
		const { openGraph, twitter } = buildSocialProjections(
			bag({ settings: { url: siteUrl, title: 'Demo', seo: { openGraph: { type: 'profile' }, twitter: { card: 'summary' } } } }),
			canonical
		);
		expect(openGraph.type).toBe('profile');
		expect(twitter.card).toBe('summary');
	});
});

describe('base fields (ported from buildSeoMeta)', () => {
	it('projects site_name, title, description, url and locale', () => {
		const { openGraph } = buildSocialProjections(
			bag({ title: 'About', description: 'About us', page: { url: '/about/', lang: 'en' } }),
			canonical
		);
		expect(openGraph.siteName).toBe('Demo Site');
		expect(openGraph.title).toBe('About');
		expect(openGraph.description).toBe('About us');
		expect(openGraph.url).toBe(canonical);
		expect(openGraph.locale).toBe('en');
	});

	// Rule: og:locale carries the OG underscore form, not BCP-47 hyphens.
	it('converts the locale to OG underscore form', () => {
		const { openGraph } = buildSocialProjections(bag({ page: { url: '/about/', locale: 'en-US' } }), canonical);
		expect(openGraph.locale).toBe('en_US');
	});

	// Rule: page-level seo overrides win over the resolved title/description.
	it('lets seo.ogTitle and seo.ogDescription override', () => {
		const { openGraph } = buildSocialProjections(
			bag({ title: 'About', description: 'Plain', seo: { ogTitle: 'Share title', ogDescription: 'Share blurb' } }),
			canonical
		);
		expect(openGraph.title).toBe('Share title');
		expect(openGraph.description).toBe('Share blurb');
	});
});

describe('og:url fallback', () => {
	// Rule: og:url uses the canonical when present.
	it('uses the resolved canonical', () => {
		expect(buildSocialProjections(bag(), canonical).openGraph.url).toBe(canonical);
	});

	// Rule: when canonical is omitted (noindex), og:url falls back to the
	// absolute page URL so share previews stay stable.
	it('falls back to the absolute page URL when canonical is undefined', () => {
		expect(buildSocialProjections(bag({ page: { url: '/about/' } }), undefined).openGraph.url).toBe(
			'https://www.example.com/about/'
		);
	});
});

describe('og:type follows the editorial type', () => {
	it('projects article for an editorial article', () => {
		const { openGraph } = buildSocialProjections(bag({ type: 'article', title: 'Post' }), canonical);
		expect(openGraph.type).toBe('article');
	});

	// Symmetry: an explicit seo.ogType still wins over the editorial type.
	it('lets seo.ogType override the editorial type', () => {
		const { openGraph } = buildSocialProjections(bag({ type: 'article', seo: { ogType: 'website' } }), canonical);
		expect(openGraph.type).toBe('website');
	});
});

describe('image degrade (two-tier)', () => {
	// Rule: full dimensions and alt ride the projection when known.
	it('emits image url, dimensions and alt when known', () => {
		const { openGraph } = buildSocialProjections(
			bag({ settings: { url: siteUrl, title: 'Demo', seo: { ogImage: { url: '/og.png', width: 1200, height: 630, alt: 'Card' } } } }),
			canonical
		);
		expect(openGraph.image).toBe('/og.png');
		expect(openGraph.imageWidth).toBe(1200);
		expect(openGraph.imageHeight).toBe(630);
		expect(openGraph.imageAlt).toBe('Card');
	});

	// Rule: a bare-path image yields a url-only og:image, no dimension keys.
	it('emits a url-only image when dimensions are absent', () => {
		const { openGraph } = buildSocialProjections(
			bag({ settings: { url: siteUrl, title: 'Demo', seo: { ogImage: '/og.png' } } }),
			canonical
		);
		expect(openGraph.image).toBe('/og.png');
		expect(openGraph.imageWidth).toBeUndefined();
		expect(openGraph.imageHeight).toBeUndefined();
		expect(openGraph.imageAlt).toBeUndefined();
	});

	it('omits the image entirely when no share image is configured', () => {
		expect(buildSocialProjections(bag(), canonical).openGraph.image).toBeUndefined();
	});
});

describe('og:locale:alternate', () => {
	// Rule: alternates come from navigator siblings sharing a translationKey,
	// in underscore form, excluding self and the primary locale.
	it('derives alternates from sibling translations', () => {
		const { openGraph } = buildSocialProjections(
			bag({
				page: { url: '/about/', locale: 'en-US' },
				_navigator: {
					nodes: {
						'/about/': { url: '/about/', translationKey: 'about', locale: 'en-US' },
						'/nl/over/': { url: '/nl/over/', translationKey: 'about', locale: 'nl-NL' },
						'/contact/': { url: '/contact/', translationKey: 'contact', locale: 'fr-FR' }
					}
				}
			}),
			canonical
		);
		expect(openGraph.localeAlternate).toEqual(['nl_NL']);
	});

	it('omits localeAlternate when the page has no siblings', () => {
		expect(buildSocialProjections(bag(), canonical).openGraph.localeAlternate).toBeUndefined();
	});
});

describe('article:* gating', () => {
	const articleBag = (overrides = {}) =>
		bag({
			type: 'article',
			title: 'Post',
			sectionLabel: 'Blog',
			page: { url: '/blog/hello/', date: new Date('2026-01-02') },
			...overrides
		});

	// Rule: article:* only appears when the page projects as an article.
	it('omits article metadata for a non-article page', () => {
		expect(buildSocialProjections(bag({ title: 'About' }), canonical).openGraph.article).toBeUndefined();
	});

	it('emits published time, section and author for an article', () => {
		const { openGraph } = buildSocialProjections(
			articleBag({ schema: { person: { name: 'Jane' } } }),
			'https://www.example.com/blog/hello/'
		);
		expect(openGraph.article.publishedTime).toBe(new Date('2026-01-02').toISOString());
		expect(openGraph.article.section).toBe('Blog');
		expect(openGraph.article.authors).toEqual(['Jane']);
	});

	// Author chain: Person preferred, else the primary entity (Organization).
	it('falls the author back to the Organization when no Person is set', () => {
		const { openGraph } = buildSocialProjections(
			articleBag({ schema: { organization: { name: 'Acme' } } }),
			'https://www.example.com/blog/hello/'
		);
		expect(openGraph.article.authors).toEqual(['Acme']);
	});
});

describe('twitter duplicate suppression', () => {
	// Rule: Twitter inherits from OG, so an override equal to its OG counterpart
	// is dropped rather than emitted as noise.
	it('drops twitter overrides that equal their OG counterpart', () => {
		const { twitter } = buildSocialProjections(
			bag({
				title: 'About',
				description: 'About us',
				settings: { url: siteUrl, title: 'Demo', seo: { ogImage: '/og.png' } },
				seo: { twitterTitle: 'About', twitterDescription: 'About us', twitterImage: '/og.png' }
			}),
			canonical
		);
		expect(twitter.title).toBeUndefined();
		expect(twitter.description).toBeUndefined();
		expect(twitter.image).toBeUndefined();
	});

	it('keeps twitter overrides that differ from OG', () => {
		const { twitter } = buildSocialProjections(
			bag({
				title: 'About',
				description: 'About us',
				settings: { url: siteUrl, title: 'Demo', seo: { ogImage: '/og.png' } },
				seo: { twitterTitle: 'Different', twitterDescription: 'Also different', twitterImage: '/twitter.png' }
			}),
			canonical
		);
		expect(twitter.title).toBe('Different');
		expect(twitter.description).toBe('Also different');
		expect(twitter.image).toBe('/twitter.png');
	});

	it('carries twitter:site from page or site settings', () => {
		const { twitter } = buildSocialProjections(bag({ seo: { twitterSite: '@demo' } }), canonical);
		expect(twitter.site).toBe('@demo');
	});
});
