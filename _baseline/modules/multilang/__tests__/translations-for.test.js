import { describe, it, expect } from 'vitest';
import translationsFor from '../filters/translations-for.js';

const map = {
	about: {
		en: { url: '/about/', lang: 'en', label: 'English', isDefaultLang: true },
		nl: { url: '/nl/about/', lang: 'nl', label: 'Nederlands', isDefaultLang: false },
		fr: { url: '/fr/about/', lang: 'fr', label: 'Français', isDefaultLang: false }
	},
	contact: {
		en: { url: '/contact/', lang: 'en', label: 'English', isDefaultLang: true }
	}
};

describe('translationsFor', () => {
	it('returns every variant of the page, itself included', () => {
		const result = translationsFor({ translationKey: 'about' }, map);
		expect(result.map((entry) => entry.lang)).toEqual(['en', 'fr', 'nl']);
	});

	it('sorts by language code so output is stable across builds', () => {
		const shuffled = { about: { nl: map.about.nl, en: map.about.en, fr: map.about.fr } };
		const result = translationsFor({ translationKey: 'about' }, shuffled);
		expect(result.map((entry) => entry.lang)).toEqual(['en', 'fr', 'nl']);
	});

	it('returns [] when the page has no translationKey', () => {
		expect(translationsFor({ lang: 'en' }, map)).toEqual([]);
	});

	it('returns [] when the key has no entry', () => {
		expect(translationsFor({ translationKey: 'missing' }, map)).toEqual([]);
	});

	it('returns [] when the store is empty, which is a single-language site', () => {
		expect(translationsFor({ translationKey: 'about' }, null)).toEqual([]);
	});
});
