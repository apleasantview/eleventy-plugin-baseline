import { describe, it, expect } from 'vitest';
import defaultTranslation from '../filters/default-translation.js';

const map = {
	about: {
		nl: { url: '/nl/about/', lang: 'nl', isDefaultLang: false },
		en: { url: '/about/', lang: 'en', isDefaultLang: true }
	},
	orphan: {
		nl: { url: '/nl/orphan/', lang: 'nl', isDefaultLang: false }
	}
};

describe('defaultTranslation', () => {
	it('returns the variant flagged as the default language', () => {
		expect(defaultTranslation({ translationKey: 'about' }, map).url).toBe('/about/');
	});

	it('returns null when no variant is the default language', () => {
		expect(defaultTranslation({ translationKey: 'orphan' }, map)).toBeNull();
	});

	it('returns null when the page has no translationKey', () => {
		expect(defaultTranslation({ lang: 'nl' }, map)).toBeNull();
	});

	it('returns null when the store is empty', () => {
		expect(defaultTranslation({ translationKey: 'about' }, null)).toBeNull();
	});
});
