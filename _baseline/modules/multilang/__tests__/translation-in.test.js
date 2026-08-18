import { describe, it, expect } from 'vitest';
import translationIn from '../filters/translation-in.js';

const map = {
	about: {
		en: { url: '/about/', lang: 'en', isDefaultLang: true },
		fr: { url: '/fr/about/', lang: 'fr', isDefaultLang: false }
	}
};

describe('translationIn', () => {
	it('returns the requested language variant', () => {
		expect(translationIn({ translationKey: 'about' }, map, 'fr').url).toBe('/fr/about/');
	});

	it('returns null when that language has no variant', () => {
		expect(translationIn({ translationKey: 'about' }, map, 'nl')).toBeNull();
	});

	it('returns null when the page has no translationKey', () => {
		expect(translationIn({ lang: 'en' }, map, 'fr')).toBeNull();
	});

	it('returns null when the store is empty', () => {
		expect(translationIn({ translationKey: 'about' }, null, 'fr')).toBeNull();
	});
});
