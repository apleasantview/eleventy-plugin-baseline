import { describe, it, expect, vi } from 'vitest';
import { registerTranslations } from '../register-translations.js';

const languages = { en: { languageName: 'English' }, nl: { languageName: 'Nederlands' } };

function graphWith(nlUrl) {
	return {
		nodes: {
			'/about/': {
				url: '/about/',
				lang: 'en',
				translationKey: 'about',
				isDefaultLang: true,
				title: 'About'
			},
			[nlUrl]: {
				url: nlUrl,
				lang: 'nl',
				translationKey: 'about',
				isDefaultLang: false,
				title: 'Over ons'
			}
		}
	};
}

/**
 * Stands in for eleventyConfig and the runtime, capturing the computed callback
 * so a test can call it the way the cascade would.
 */
function setup() {
	let computed;
	const eleventyConfig = {
		addGlobalData: (key, fn) => {
			if (key === 'eleventyComputed.page.translations') computed = fn();
		}
	};
	const runtime = {
		contentGraph: null,
		translationIndex: { set: vi.fn(), get: () => null }
	};

	registerTranslations(eleventyConfig, { runtime, languages, defaultLanguage: 'en' });

	return { runtime, read: (data) => computed(data) };
}

const englishAboutPage = { translationKey: 'about', page: { url: '/about/' } };

describe('registerTranslations', () => {
	it('lists the siblings of the current page, excluding itself', () => {
		const { runtime, read } = setup();
		runtime.contentGraph = graphWith('/nl/about/');

		expect(read(englishAboutPage)).toEqual([
			{ url: '/nl/about/', lang: 'nl', label: 'Nederlands', title: 'Over ons', isDefaultLang: false }
		]);
	});

	it('returns [] before the graph exists, which is the pre-pass', () => {
		const { read } = setup();
		expect(read(englishAboutPage)).toEqual([]);
	});

	it('returns [] for a page with no translationKey', () => {
		const { runtime, read } = setup();
		runtime.contentGraph = graphWith('/nl/about/');

		expect(read({ page: { url: '/contact/' } })).toEqual([]);
	});

	it('rebuilds when the graph is replaced, as a serve-mode rebuild does', () => {
		const { runtime, read } = setup();

		runtime.contentGraph = graphWith('/nl/about/');
		expect(read(englishAboutPage)[0].url).toBe('/nl/about/');

		// A watch rebuild assigns a fresh graph object; the stale one must not win.
		runtime.contentGraph = graphWith('/nl/over-ons/');
		expect(read(englishAboutPage)[0].url).toBe('/nl/over-ons/');
	});

	it('groups once per graph, not once per page', () => {
		const { runtime, read } = setup();
		runtime.contentGraph = graphWith('/nl/about/');

		read(englishAboutPage);
		read(englishAboutPage);
		read(englishAboutPage);

		expect(runtime.translationIndex.set).toHaveBeenCalledTimes(1);
	});

	it('publishes the index for head to read at transform-time', () => {
		const { runtime, read } = setup();
		runtime.contentGraph = graphWith('/nl/about/');
		read(englishAboutPage);

		const published = runtime.translationIndex.set.mock.calls[0][0];
		expect(published.about.nl.url).toBe('/nl/about/');
		expect(published.about.en.url).toBe('/about/');
	});
});
