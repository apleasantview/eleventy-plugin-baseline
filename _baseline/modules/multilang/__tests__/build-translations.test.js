import { describe, it, expect } from 'vitest';
import { buildTranslations } from '../utils/build-translations.js';

const languages = {
	en: { languageName: 'English' },
	nl: { languageName: 'Nederlands' },
	fr: { languageName: 'Français' }
};

const context = {
	languages,
	allowedLanguages: new Set(['en', 'nl', 'fr']),
	defaultLanguage: 'en',
	resolveLang: (data) => data.lang
};

function page(url, data = {}) {
	return { url, inputPath: `./src${url}index.md`, data };
}

const pages = [
	page('/about/', { lang: 'en', translationKey: 'about', title: 'About' }),
	page('/nl/about/', { lang: 'nl', translationKey: 'about', title: 'Over ons' }),
	page('/contact/', { lang: 'en', translationKey: 'contact' }),
	page('/orphan/', { lang: 'en' })
];

describe('buildTranslations', () => {
	it('groups pages by translationKey then lang', () => {
		const map = buildTranslations(pages, context);

		expect(Object.keys(map).sort()).toEqual(['about', 'contact']);
		expect(map.about.nl).toEqual({
			url: '/nl/about/',
			lang: 'nl',
			label: 'Nederlands',
			title: 'Over ons',
			description: undefined,
			isDefaultLang: false
		});
	});

	it('skips a page with no translationKey, and one whose lang will not resolve', () => {
		const map = buildTranslations([...pages, page('/nolang/', { translationKey: 'nolang' })], context);

		expect(map.nolang).toBeUndefined();
		expect(Object.keys(map)).not.toContain(undefined);
	});

	it('warns on a lang outside the configured map and leaves it out', () => {
		const warnings = [];
		const map = buildTranslations([page('/de/about/', { lang: 'de', translationKey: 'about' })], {
			...context,
			log: { warn: (message) => warnings.push(message) }
		});

		expect(map).toEqual({});
		expect(warnings).toEqual(['Unknown lang "de" in ./src/de/about/index.md']);
	});

	it('accepts any lang when no language map is configured', () => {
		const map = buildTranslations([page('/de/about/', { lang: 'de', translationKey: 'about' })], {
			...context,
			allowedLanguages: new Set()
		});

		expect(map.about.de.label).toBe('de');
	});

	it('orders langs alphabetically rather than by page order', () => {
		const map = buildTranslations([...pages].reverse(), context);

		expect(Object.keys(map.about)).toEqual(['en', 'nl']);
	});

	// The reason this producer keys through the shared helper: the parts of a
	// split page share one translationKey, so grouping on it alone means the
	// last part overwrites the rest and five of six advertise a wrong sibling.
	describe('a split page', () => {
		const split = [
			page('/menu/', { lang: 'en', translationKey: 'menu', part: { index: 0 } }),
			page('/menu/2/', { lang: 'en', translationKey: 'menu', part: { index: 1 } }),
			page('/nl/menu/', { lang: 'nl', translationKey: 'menu', part: { index: 0 } }),
			page('/nl/menu/2/', { lang: 'nl', translationKey: 'menu', part: { index: 1 } })
		];

		it('keeps part one on the bare key, so an unsplit translation still pairs with it', () => {
			const map = buildTranslations(split, context);

			expect(map.menu).toEqual({
				en: expect.objectContaining({ url: '/menu/' }),
				nl: expect.objectContaining({ url: '/nl/menu/' })
			});
		});

		it('pairs later parts with their own counterpart', () => {
			const map = buildTranslations(split, context);

			expect(map['menu#2']).toEqual({
				en: expect.objectContaining({ url: '/menu/2/' }),
				nl: expect.objectContaining({ url: '/nl/menu/2/' })
			});
		});

		it('gives a part with no counterpart a group of one rather than a false pair', () => {
			const map = buildTranslations(split.slice(0, 3), context);

			expect(Object.keys(map['menu#2'])).toEqual(['en']);
		});
	});
});
