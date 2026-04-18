import { describe, it, expect } from 'vitest';
import i18nDefaultTranslation from '../../multilang-core/filters/i18n-default-translation.js';

const collection = [
	{ url: '/en/about/', locale: { translationKey: 'about', lang: 'en', isDefaultLang: true } },
	{ url: '/nl/about/', locale: { translationKey: 'about', lang: 'nl', isDefaultLang: false } },
	{ url: '/fr/about/', locale: { translationKey: 'about', lang: 'fr', isDefaultLang: false } },
	{ url: '/en/orphan/' }
];

describe('i18nDefaultTranslation', () => {
	it('returns the default-language entry matching the translationKey', () => {
		const page = { locale: { translationKey: 'about', lang: 'nl', isDefaultLang: false } };
		const result = i18nDefaultTranslation(page, collection);
		expect(result).toEqual({
			url: '/en/about/',
			locale: { translationKey: 'about', lang: 'en', isDefaultLang: true }
		});
	});

	it('returns null when the page has no translationKey', () => {
		const page = { locale: { lang: 'en', isDefaultLang: true } };
		expect(i18nDefaultTranslation(page, collection)).toBeNull();
	});

	it('returns null when no entry for the translationKey is the default language', () => {
		const nonDefault = [
			{ url: '/nl/about/', locale: { translationKey: 'about', lang: 'nl', isDefaultLang: false } },
			{ url: '/fr/about/', locale: { translationKey: 'about', lang: 'fr', isDefaultLang: false } }
		];
		const page = { locale: { translationKey: 'about', lang: 'nl', isDefaultLang: false } };
		expect(i18nDefaultTranslation(page, nonDefault)).toBeNull();
	});

	it('returns null when no entry matches the translationKey', () => {
		const page = { locale: { translationKey: 'contact', lang: 'en', isDefaultLang: true } };
		expect(i18nDefaultTranslation(page, collection)).toBeNull();
	});

	it('skips entries without a locale property', () => {
		const page = { locale: { translationKey: 'about', lang: 'nl', isDefaultLang: false } };
		const result = i18nDefaultTranslation(page, collection);
		expect(result).not.toBeNull();
		expect(result.locale.isDefaultLang).toBe(true);
	});
});
