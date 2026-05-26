import { describe, it, expect } from 'vitest';
import i18nTranslationsFor from '../../multilang/filters/i18n-translations-for.js';

const collection = [
	{ url: '/en/about/', translationKey: 'about', lang: 'en', isDefaultLang: true },
	{ url: '/nl/about/', translationKey: 'about', lang: 'nl', isDefaultLang: false },
	{ url: '/fr/about/', translationKey: 'about', lang: 'fr', isDefaultLang: false },
	{ url: '/en/contact/', translationKey: 'contact', lang: 'en', isDefaultLang: true },
	{ url: '/en/orphan/' }
];

describe('i18nTranslationsFor', () => {
	it('returns all entries matching the translationKey', () => {
		const page = { translationKey: 'about', lang: 'en', isDefaultLang: true };
		const result = i18nTranslationsFor(page, collection);
		expect(result).toHaveLength(3);
		expect(result.map((p) => p.lang).sort()).toEqual(['en', 'fr', 'nl']);
	});

	it('returns [] when the page has no translationKey', () => {
		const page = { lang: 'en', isDefaultLang: true };
		expect(i18nTranslationsFor(page, collection)).toEqual([]);
	});

	it('returns [] when no entries match', () => {
		const page = { translationKey: 'missing', lang: 'en', isDefaultLang: true };
		expect(i18nTranslationsFor(page, collection)).toEqual([]);
	});

	it('skips entries without a translationKey', () => {
		const page = { translationKey: 'about', lang: 'en', isDefaultLang: true };
		const result = i18nTranslationsFor(page, collection);
		expect(result.every((p) => p.translationKey)).toBe(true);
	});
});
