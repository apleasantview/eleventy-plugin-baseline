import { describe, it, expect } from 'vitest';
import i18nTranslationIn from '../../multilang-core/filters/i18n-translation-in.js';

const collection = [
	{ url: '/en/about/', locale: { translationKey: 'about', lang: 'en', isDefaultLang: true } },
	{ url: '/nl/about/', locale: { translationKey: 'about', lang: 'nl', isDefaultLang: false } },
	{ url: '/fr/about/', locale: { translationKey: 'about', lang: 'fr', isDefaultLang: false } },
	{ url: '/en/orphan/' }
];

describe('i18nTranslationIn', () => {
	it('returns the entry matching translationKey and lang', () => {
		const page = { locale: { translationKey: 'about', lang: 'en', isDefaultLang: true } };
		const result = i18nTranslationIn(page, collection, 'nl');
		expect(result).toEqual({
			url: '/nl/about/',
			locale: { translationKey: 'about', lang: 'nl', isDefaultLang: false }
		});
	});

	it('returns null when the page has no translationKey', () => {
		const page = { locale: { lang: 'en', isDefaultLang: true } };
		expect(i18nTranslationIn(page, collection, 'nl')).toBeNull();
	});

	it('returns null when no entry matches the requested lang', () => {
		const page = { locale: { translationKey: 'about', lang: 'en', isDefaultLang: true } };
		expect(i18nTranslationIn(page, collection, 'de')).toBeNull();
	});

	it('returns null when no entry matches the translationKey', () => {
		const page = { locale: { translationKey: 'contact', lang: 'en', isDefaultLang: true } };
		expect(i18nTranslationIn(page, collection, 'nl')).toBeNull();
	});

	it('skips entries without a locale property', () => {
		const page = { locale: { translationKey: 'about', lang: 'en', isDefaultLang: true } };
		const result = i18nTranslationIn(page, collection, 'fr');
		expect(result).not.toBeNull();
		expect(result.locale.lang).toBe('fr');
	});
});
