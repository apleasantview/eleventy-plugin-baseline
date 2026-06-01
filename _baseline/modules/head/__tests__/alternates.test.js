import { describe, expect, it } from 'vitest';
import { buildAlternates } from '../utils/alternates.js';

const siteUrl = 'https://www.example.com';

// translationsMap shape: map[translationKey][lang] = { url, lang, isDefaultLang }
function mapWith(variants) {
	return { post: variants };
}

describe('buildAlternates', () => {
	it('returns [] when translationKey is falsy', () => {
		expect(buildAlternates(undefined, mapWith({}), siteUrl)).toEqual([]);
	});

	it('returns [] when translationsMap is missing', () => {
		expect(buildAlternates('post', undefined, siteUrl)).toEqual([]);
	});

	it('returns [] when the key has no variants', () => {
		const out = buildAlternates(
			'missing',
			mapWith({ en: { url: '/en/post/', lang: 'en' } }),
			siteUrl
		);
		expect(out).toEqual([]);
	});

	it('skips variants that have no url', () => {
		const out = buildAlternates(
			'post',
			mapWith({
				en: { url: '/en/post/', lang: 'en' },
				nl: { lang: 'nl' }
			}),
			siteUrl
		);
		expect(out).toEqual([{ rel: 'alternate', hreflang: 'en', href: 'https://www.example.com/en/post/' }]);
	});

	it('resolves each href against siteUrl', () => {
		const out = buildAlternates('post', mapWith({ en: { url: '/en/post/', lang: 'en' } }), siteUrl);
		expect(out).toEqual([{ rel: 'alternate', hreflang: 'en', href: 'https://www.example.com/en/post/' }]);
	});

	it('leaves href untouched when siteUrl is absent', () => {
		const out = buildAlternates('post', mapWith({ en: { url: '/en/post/', lang: 'en' } }), undefined);
		expect(out).toEqual([{ rel: 'alternate', hreflang: 'en', href: '/en/post/' }]);
	});

	it('emits an x-default duplicate for the default-language variant', () => {
		const out = buildAlternates(
			'post',
			mapWith({ en: { url: '/en/post/', lang: 'en', isDefaultLang: true } }),
			siteUrl
		);
		expect(out).toEqual([
			{ rel: 'alternate', hreflang: 'en', href: 'https://www.example.com/en/post/' },
			{ rel: 'alternate', hreflang: 'x-default', href: 'https://www.example.com/en/post/' }
		]);
	});

	it('builds one link per variant, with x-default only for the default', () => {
		const out = buildAlternates(
			'post',
			mapWith({
				en: { url: '/en/post/', lang: 'en', isDefaultLang: true },
				nl: { url: '/nl/post/', lang: 'nl' },
				fr: { url: '/fr/post/', lang: 'fr' }
			}),
			siteUrl
		);
		expect(out).toEqual([
			{ rel: 'alternate', hreflang: 'en', href: 'https://www.example.com/en/post/' },
			{ rel: 'alternate', hreflang: 'x-default', href: 'https://www.example.com/en/post/' },
			{ rel: 'alternate', hreflang: 'nl', href: 'https://www.example.com/nl/post/' },
			{ rel: 'alternate', hreflang: 'fr', href: 'https://www.example.com/fr/post/' }
		]);
	});
});
