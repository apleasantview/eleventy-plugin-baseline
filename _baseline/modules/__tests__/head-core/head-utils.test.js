import { describe, it, expect } from 'vitest';
import {
	pick,
	absoluteUrl,
	resolveCanonical,
	flattenHead,
	buildHead
} from '../../head-core/utils/head-utils.js';

describe('pick', () => {
	it('returns the first defined, non-null value', () => {
		expect(pick(undefined, null, 'a', 'b')).toBe('a');
	});

	it('returns undefined when all values are nullish', () => {
		expect(pick(undefined, null)).toBeUndefined();
	});

	it('keeps falsy-but-defined values (0, "", false)', () => {
		expect(pick(undefined, 0)).toBe(0);
		expect(pick(undefined, '')).toBe('');
		expect(pick(undefined, false)).toBe(false);
	});

	it('returns undefined when called with no arguments', () => {
		expect(pick()).toBeUndefined();
	});
});

describe('absoluteUrl', () => {
	it('returns an already-absolute https URL unchanged', () => {
		expect(absoluteUrl('https://www.example.com', '', 'https://other.com/a')).toBe('https://other.com/a');
	});

	it('returns a protocol-relative URL unchanged', () => {
		expect(absoluteUrl('https://www.example.com', '', '//cdn.com/img.jpg')).toBe('//cdn.com/img.jpg');
	});

	it('returns empty input unchanged', () => {
		expect(absoluteUrl('https://www.example.com', '', '')).toBe('');
	});

	it('joins a relative URL with siteUrl', () => {
		expect(absoluteUrl('https://www.example.com', '', '/about/')).toBe('https://www.example.com/about/');
	});

	it('strips trailing slashes from siteUrl', () => {
		expect(absoluteUrl('https://www.example.com/', '', '/about/')).toBe('https://www.example.com/about/');
		expect(absoluteUrl('https://www.example.com///', '', '/about/')).toBe('https://www.example.com/about/');
	});

	it('returns only the joined path when siteUrl is empty', () => {
		const result = absoluteUrl('', '', '/about/');
		expect(result.startsWith('http')).toBe(false);
		expect(result).toContain('/about/');
	});

	it('applies a non-root pathPrefix', () => {
		const result = absoluteUrl('https://www.example.com', '/docs', '/page/');
		expect(result).toContain('https://www.example.com');
		expect(result).toContain('/docs');
		expect(result).toContain('/page/');
	});
});

describe('resolveCanonical', () => {
	const env = { siteUrl: 'https://www.example.com', pathPrefix: '' };

	it('uses an explicit head.canonical when provided', () => {
		const result = resolveCanonical({ canonical: '/custom/' }, { url: '/about/' }, {}, env);
		expect(result).toBe('https://www.example.com/custom/');
	});

	it('falls back to page.url when no explicit canonical', () => {
		const result = resolveCanonical({}, { url: '/about/' }, {}, env);
		expect(result).toBe('https://www.example.com/about/');
	});

	it('falls back to contentMap.inputPathToUrl when page.url is missing', () => {
		const page = { inputPath: './src/about.md' };
		const contentMap = { inputPathToUrl: { './src/about.md': ['/about/'] } };
		const result = resolveCanonical({}, page, contentMap, env);
		expect(result).toBe('https://www.example.com/about/');
	});

	it('honours pageUrlOverride above page.url', () => {
		const result = resolveCanonical(
			{},
			{ url: '/about/' },
			{},
			{ ...env, pageUrlOverride: '/override/' }
		);
		expect(result).toBe('https://www.example.com/override/');
	});

	it('returns undefined when nothing is resolvable', () => {
		const result = resolveCanonical({}, {}, {}, env);
		expect(result).toBeUndefined();
	});
});

describe('flattenHead', () => {
	it('returns the expected flat shape keys', () => {
		const result = flattenHead({}, '');
		expect(Object.keys(result)).toEqual([
			'meta',
			'title',
			'linkCanonical',
			'style',
			'link',
			'script',
			'meta_social'
		]);
	});

	it('merges meta and miscMeta and deduplicates by name', () => {
		const head = {
			meta: [{ name: 'description', content: 'first' }],
			miscMeta: [{ name: 'description', content: 'second' }]
		};
		const result = flattenHead(head, '');
		const descriptions = result.meta.filter((m) => m.name === 'description');
		expect(descriptions).toHaveLength(1);
		expect(descriptions[0].content).toBe('second');
	});

	it('builds social meta from openGraph and twitter, skipping falsy values', () => {
		const head = {
			openGraph: { 'og:title': 'Hello', 'og:image': '' },
			twitter: { 'twitter:card': 'summary' }
		};
		const result = flattenHead(head, '');
		expect(result.meta_social).toContainEqual({ property: 'og:title', content: 'Hello' });
		expect(result.meta_social).toContainEqual({ name: 'twitter:card', content: 'summary' });
		expect(result.meta_social.find((m) => m.property === 'og:image')).toBeUndefined();
	});

	it('prepends structuredData as a JSON-LD script', () => {
		const head = { structuredData: { '@context': 'https://schema.org' } };
		const result = flattenHead(head, '');
		expect(result.script[0]).toEqual({
			type: 'application/ld+json',
			content: JSON.stringify({ '@context': 'https://schema.org' })
		});
	});

	it('populates linkCanonical when canonical is provided, empty otherwise', () => {
		const withCanonical = flattenHead({}, 'https://www.example.com/about/');
		expect(withCanonical.linkCanonical).toEqual([
			{ rel: 'canonical', href: 'https://www.example.com/about/' }
		]);

		const withoutCanonical = flattenHead({}, '');
		expect(withoutCanonical.linkCanonical).toEqual([]);
	});

	it('deduplicates link + hreflang by rel|href', () => {
		const head = {
			link: [{ rel: 'alternate', href: '/en/', hreflang: 'en' }],
			hreflang: [{ rel: 'alternate', href: '/en/', hreflang: 'en-gb' }]
		};
		const result = flattenHead(head, '');
		expect(result.link).toHaveLength(1);
	});
});

describe('buildHead', () => {
	const env = { siteUrl: 'https://www.example.com', pathPrefix: '', contentMap: {} };

	it('returns the expected flat shape', () => {
		const result = buildHead({ page: { url: '/about/' } }, env);
		expect(result).toHaveProperty('meta');
		expect(result).toHaveProperty('title');
		expect(result).toHaveProperty('linkCanonical');
		expect(result).toHaveProperty('meta_social');
	});

	it('composes page title and site title with a pipe separator', () => {
		const data = {
			title: 'About',
			settings: { title: 'Example Site' },
			page: { url: '/about/' }
		};
		const result = buildHead(data, env);
		expect(result.title).toBe('About | Example Site');
	});

	it('lets user.head.title override the composed title (current behaviour)', () => {
		const data = {
			title: 'From data',
			head: { title: 'From user' },
			settings: { title: 'From site' },
			page: { url: '/' }
		};
		const result = buildHead(data, env);
		expect(result.title).toBe('From user');
	});

	it('falls back to data.title composed with site.title when no user.title', () => {
		const data = {
			title: 'From data',
			settings: { title: 'From site' },
			page: { url: '/' }
		};
		const result = buildHead(data, env);
		expect(result.title).toBe('From data | From site');
	});

	it('honours data.noindex precedence in the robots meta', () => {
		const data = {
			noindex: true,
			page: { url: '/' },
			site: { noindex: false }
		};
		const result = buildHead(data, env);
		const robots = result.meta.find((m) => m.name === 'robots');
		expect(robots.content).toBe('noindex, nofollow');
	});

	it('resolves user.canonical through absoluteUrl (current double-call behaviour)', () => {
		const data = {
			head: { canonical: '/custom/' },
			page: { url: '/about/' }
		};
		const result = buildHead(data, env);
		expect(result.linkCanonical).toEqual([
			{ rel: 'canonical', href: 'https://www.example.com/custom/' }
		]);
	});
});
