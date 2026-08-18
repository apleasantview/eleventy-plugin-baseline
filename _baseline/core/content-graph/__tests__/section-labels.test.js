import { describe, it, expect } from 'vitest';
import { buildSectionLabelIndex, relabelBreadcrumbs } from '../section-labels.js';

const nodes = {
	'/docs/': { url: '/docs/', section: ['docs'], title: 'Documentation' },
	'/docs/module/': { url: '/docs/module/', section: ['docs', 'module'], title: 'Modules reference' },
	'/docs/module/head/': { url: '/docs/module/head/', section: ['docs', 'module'], title: 'head' },
	'/nl/docs/': { url: '/nl/docs/', section: ['docs'], title: 'Documentatie' },
	'/about/': { url: '/about/', section: ['root'], title: 'About' }
};

describe('buildSectionLabelIndex', () => {
	// Rule: a node is its section's index page when its url is the url its own
	// section path builds to. A leaf sits below that url and is not one.
	it('indexes section index pages and skips leaves', () => {
		const index = buildSectionLabelIndex(nodes);

		expect(index['/docs/']).toBe('Documentation');
		expect(index['/docs/module/']).toBe('Modules reference');
		expect(index['/docs/module/head/']).toBeUndefined();
	});

	// Keyed by url rather than section path, so a translated section is its own
	// entry and needs no language argument.
	it('keeps a translated section separate from its default-language twin', () => {
		const index = buildSectionLabelIndex(nodes);

		expect(index['/nl/docs/']).toBe('Documentatie');
		expect(index['/docs/']).toBe('Documentation');
	});

	// `root` names no directory, so a page carrying only that sentinel is not
	// the index of anything.
	it('ignores a root-sentinel section', () => {
		expect(buildSectionLabelIndex(nodes)['/about/']).toBeUndefined();
	});

	// The guard that stops a page being mistaken for its own section index
	// because its url happens to end with the section path.
	it('rejects a page sitting more than one segment above its section path', () => {
		const index = buildSectionLabelIndex({
			'/blog/archive/docs/': { url: '/blog/archive/docs/', section: ['docs'], title: 'Not the index' }
		});

		expect(index).toEqual({});
	});

	it('skips nodes with no title, section or url', () => {
		expect(
			buildSectionLabelIndex({
				a: { url: '/a/', section: ['a'] },
				b: { url: '/b/', title: 'B' },
				c: { section: ['c'], title: 'C' }
			})
		).toEqual({});
		expect(buildSectionLabelIndex(undefined)).toEqual({});
	});
});

describe('relabelBreadcrumbs', () => {
	const trail = () => ({
		'/docs/module/head/': {
			breadcrumbs: [
				{ label: 'Home', url: '/' },
				{ label: 'Docs', url: '/docs/' },
				{ label: 'Module', url: '/docs/module/' },
				{ label: 'head', url: '/docs/module/head/', current: true }
			]
		}
	});

	// The whole point: the pre-pass builds the trail before the node set exists,
	// so ancestors arrive slug-derived and get corrected once it does.
	it('rewrites ancestor labels from the index', () => {
		const set = trail();
		relabelBreadcrumbs(set, { '/docs/': 'Documentation', '/docs/module/': 'Modules reference' });

		expect(set['/docs/module/head/'].breadcrumbs.map((c) => c.label)).toEqual([
			'Home',
			'Documentation',
			'Modules reference',
			'head'
		]);
	});

	it('leaves the current crumb and unindexed crumbs alone', () => {
		const set = trail();
		relabelBreadcrumbs(set, { '/docs/module/head/': 'Overwritten' });

		expect(set['/docs/module/head/'].breadcrumbs.map((c) => c.label)).toEqual([
			'Home',
			'Docs',
			'Module',
			'head'
		]);
	});

	it('survives nodes with no trail', () => {
		const set = { '/a/': {}, '/b/': { breadcrumbs: [] } };
		expect(() => relabelBreadcrumbs(set, { '/docs/': 'Documentation' })).not.toThrow();
	});
});
