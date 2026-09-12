import { describe, it, expect } from 'vitest';
import { slugifyAnchor } from '../slugify-anchor.js';
import { slugify } from '../slugify.js';

describe('slugifyAnchor', () => {
	it('drops symbols the charmap would spell out', () => {
		expect(slugifyAnchor('The <head> placeholder')).toBe('the-head-placeholder');
		expect(slugifyAnchor('100% done')).toBe('100-done');
		expect(slugifyAnchor('Q&A')).toBe('q-a');
		expect(slugifyAnchor('3 > 2')).toBe('3-2');
	});

	it('turns identifier punctuation into a word boundary', () => {
		expect(slugifyAnchor('page.translations')).toBe('page-translations');
		expect(slugifyAnchor('Add a schema.js file')).toBe('add-a-schema-js-file');
		expect(slugifyAnchor('Settings (src/_data/settings.js)')).toBe('settings-src-data-settings-js');
		expect(slugifyAnchor('A/B testing')).toBe('a-b-testing');
	});

	it('leaves camelCase alone', () => {
		// The reason Baseline stays on `slugify` rather than Eleventy's package,
		// which decamelizes `inlineESbuild` into `inline-e-sbuild`.
		expect(slugifyAnchor('inlineESbuild')).toBe('inlineesbuild');
		expect(slugifyAnchor('HtmlBasePlugin')).toBe('htmlbaseplugin');
	});

	it('still transliterates, so anchors stay ASCII on a multilingual site', () => {
		expect(slugifyAnchor('Eleventy et le fossé pédagogique')).toBe('eleventy-et-le-fosse-pedagogique');
		expect(slugifyAnchor('Eén content graph eronder')).toBe('een-content-graph-eronder');
	});

	it('collapses runs and trims, like the identity slugifier', () => {
		expect(slugifyAnchor('foo...bar')).toBe('foo-bar');
		expect(slugifyAnchor('  ...leading and trailing...  ')).toBe('leading-and-trailing');
	});

	it('returns undefined for empty or punctuation-only input', () => {
		expect(slugifyAnchor(null)).toBeUndefined();
		expect(slugifyAnchor(undefined)).toBeUndefined();
		expect(slugifyAnchor('')).toBeUndefined();
		expect(slugifyAnchor('...')).toBeUndefined();
		expect(slugifyAnchor('<>')).toBeUndefined();
	});

	it('agrees with the identity slugifier on ordinary prose', () => {
		// Most headings are prose, so the two only diverge where it matters.
		for (const text of ['About Us', 'Getting Started', 'Why this exists', 'Café']) {
			expect(slugifyAnchor(text)).toBe(slugify(text));
		}
	});

	it('diverges from the identity slugifier exactly where a reader would notice', () => {
		expect(slugify('page.translations')).toBe('pagetranslations');
		expect(slugifyAnchor('page.translations')).toBe('page-translations');
	});
});
