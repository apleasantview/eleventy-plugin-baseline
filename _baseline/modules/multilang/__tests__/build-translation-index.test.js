import { describe, it, expect } from 'vitest';
import { buildTranslationIndex } from '../utils/build-translation-index.js';

const languages = {
	en: { languageName: 'English' },
	nl: { languageName: 'Nederlands' },
	fr: { languageName: 'Français' }
};

const nodes = {
	'/about/': {
		url: '/about/',
		lang: 'en',
		translationKey: 'about',
		isDefaultLang: true,
		title: 'About'
	},
	'/nl/about/': {
		url: '/nl/about/',
		lang: 'nl',
		translationKey: 'about',
		isDefaultLang: false,
		title: 'Over ons'
	},
	'/fr/about/': {
		url: '/fr/about/',
		lang: 'fr',
		translationKey: 'about',
		isDefaultLang: false,
		title: 'À propos'
	},
	'/contact/': { url: '/contact/', lang: 'en', translationKey: 'contact', isDefaultLang: true },
	'/orphan/': { url: '/orphan/', lang: 'en' }
};

describe('buildTranslationIndex', () => {
	it('groups nodes by translationKey then lang', () => {
		const index = buildTranslationIndex(nodes, { languages, defaultLanguage: 'en' });

		expect(Object.keys(index).sort()).toEqual(['about', 'contact']);
		expect(Object.keys(index.about).sort()).toEqual(['en', 'fr', 'nl']);
		expect(index.about.nl).toEqual({
			url: '/nl/about/',
			lang: 'nl',
			label: 'Nederlands',
			title: 'Over ons',
			isDefaultLang: false
		});
	});

	it('emits the shape head alternates already reads', () => {
		const index = buildTranslationIndex(nodes, { languages, defaultLanguage: 'en' });
		const entry = index.about.en;

		expect(Object.keys(entry).sort()).toEqual(['description', 'isDefaultLang', 'label', 'lang', 'title', 'url']);
		expect(entry.isDefaultLang).toBe(true);
	});

	it('carries the sibling page title, which is otherwise unreachable', () => {
		const index = buildTranslationIndex(nodes, { languages, defaultLanguage: 'en' });

		expect(index.about.fr.title).toBe('À propos');
		expect(index.contact.en.title).toBeUndefined();
	});

	it('skips nodes without a translationKey', () => {
		const index = buildTranslationIndex(nodes, { languages, defaultLanguage: 'en' });
		const urls = Object.values(index).flatMap((variants) => Object.values(variants).map((entry) => entry.url));

		expect(urls).not.toContain('/orphan/');
	});

	it('skips langs outside the configured language map', () => {
		const withTypo = {
			...nodes,
			'/de/about/': { url: '/de/about/', lang: 'de', translationKey: 'about' }
		};
		const index = buildTranslationIndex(withTypo, { languages, defaultLanguage: 'en' });

		expect(Object.keys(index.about).sort()).toEqual(['en', 'fr', 'nl']);
	});

	it('accepts any lang when no language map is given', () => {
		const index = buildTranslationIndex(nodes, { defaultLanguage: 'en' });

		expect(Object.keys(index.about).sort()).toEqual(['en', 'fr', 'nl']);
		expect(index.about.nl.label).toBe('nl');
	});

	it('derives isDefaultLang from defaultLanguage when the node lacks it', () => {
		const bare = {
			'/about/': { url: '/about/', lang: 'en', translationKey: 'about' },
			'/nl/about/': { url: '/nl/about/', lang: 'nl', translationKey: 'about' }
		};
		const index = buildTranslationIndex(bare, { languages, defaultLanguage: 'en' });

		expect(index.about.en.isDefaultLang).toBe(true);
		expect(index.about.nl.isDefaultLang).toBe(false);
	});

	it('returns an empty index for a missing or empty node set', () => {
		expect(buildTranslationIndex(undefined)).toEqual({});
		expect(buildTranslationIndex({})).toEqual({});
	});

	// A page split on a content marker is many nodes sharing one translationKey.
	// Grouping on the key alone let the last part overwrite the rest, so every
	// part of every language advertised the final part as its counterpart, which
	// is neither reciprocal nor self-referential. Found on the pathprefix rig,
	// 2026-08-24.
	describe('segmented pages', () => {
		const split = {
			'/story/': { url: '/story/', lang: 'en', translationKey: 'story', part: 0 },
			'/story/2/': { url: '/story/2/', lang: 'en', translationKey: 'story', part: 1 },
			'/nl/verhaal/': { url: '/nl/verhaal/', lang: 'nl', translationKey: 'story', part: 0 },
			'/nl/verhaal/2/': { url: '/nl/verhaal/2/', lang: 'nl', translationKey: 'story', part: 1 }
		};

		it('pairs each part with the same part in the other language', () => {
			const index = buildTranslationIndex(split, { languages, defaultLanguage: 'en' });

			expect(index.story.en.url).toBe('/story/');
			expect(index.story.nl.url).toBe('/nl/verhaal/');
			expect(index['story#2'].en.url).toBe('/story/2/');
			expect(index['story#2'].nl.url).toBe('/nl/verhaal/2/');
		});

		// The translator controls where their markers go, so counts can differ.
		// A part with no counterpart gets a group of one rather than a false pair.
		it('leaves a part with no counterpart on its own', () => {
			const uneven = {
				...split,
				'/story/3/': { url: '/story/3/', lang: 'en', translationKey: 'story', part: 2 }
			};
			const index = buildTranslationIndex(uneven, { languages, defaultLanguage: 'en' });

			expect(Object.keys(index['story#3'])).toEqual(['en']);
		});
	});
});
