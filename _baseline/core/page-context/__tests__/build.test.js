import { describe, expect, it } from 'vitest';
import { createPageContext, applyTitleTemplate, resolveTitle, buildBreadcrumbs } from '../build.js';

// Drive the public builder and read the merged `head` it produces. These guard
// the dedupe regression: distinct tags must survive the settings + front-matter
// merge (links were keyed by href-only, metas by name-only, both lossy).
function buildHead({ settingsHead, pageHead } = {}) {
	const build = createPageContext({
		scope: { values: new Map() },
		slugIndex: null,
		settings: { url: 'https://www.example.com', head: settingsHead },
		runtime: {},
		options: {}
	});
	const context = build({
		page: { url: '/p/', fileSlug: 'p' },
		title: 'P',
		description: 'd',
		head: pageHead
	});
	return context.head;
}

describe('buildHead dedupe', () => {
	it('keeps links that share a host but differ in rel', () => {
		const head = buildHead({
			settingsHead: {
				link: [
					{ rel: 'preconnect', href: 'https://fonts.gstatic.com' },
					{ rel: 'dns-prefetch', href: 'https://fonts.gstatic.com' }
				]
			}
		});
		expect(head.link).toHaveLength(2);
	});

	it('collapses metas sharing a property, last value winning', () => {
		const head = buildHead({
			settingsHead: { meta: [{ property: 'og:title', content: 'site' }] },
			pageHead: { meta: [{ property: 'og:title', content: 'page' }] }
		});
		expect(head.meta).toHaveLength(1);
		expect(head.meta[0].content).toBe('page');
	});

	it('still collapses a genuine duplicate, front matter winning over settings', () => {
		const head = buildHead({
			settingsHead: { meta: [{ name: 'description', content: 'site' }] },
			pageHead: { meta: [{ name: 'description', content: 'page' }] }
		});
		expect(head.meta).toHaveLength(1);
		expect(head.meta[0].content).toBe('page');
	});

	it('still collapses a genuinely duplicated link (same rel + href)', () => {
		const head = buildHead({
			settingsHead: {
				link: [
					{ rel: 'preconnect', href: 'https://fonts.gstatic.com' },
					{ rel: 'preconnect', href: 'https://fonts.gstatic.com' }
				]
			}
		});
		expect(head.link).toHaveLength(1);
	});
});

describe('applyTitleTemplate', () => {
	it('replaces %s with the page title', () => {
		expect(applyTitleTemplate('%s', { title: 'About' })).toBe('About');
	});

	it('replaces %siteTitle% and %tagline%', () => {
		expect(applyTitleTemplate('%siteTitle% — %tagline%', { siteTitle: 'Site', tagline: 'Tag' })).toBe('Site — Tag');
	});

	it('does not let %s corrupt the %s inside %siteTitle%', () => {
		expect(applyTitleTemplate('%s | %siteTitle%', { title: 'About', siteTitle: 'Site' })).toBe('About | Site');
	});

	it('resolves an absent token to an empty string, literally', () => {
		expect(applyTitleTemplate('%s — %tagline%', { title: 'About' })).toBe('About — ');
	});
});

describe('resolveTitle', () => {
	const separator = ' – ';
	const siteTitle = 'Baseline';
	const tagline = 'Skip the setup';

	it('returns a bare page title when the page opts out with null', () => {
		const out = resolveTitle({
			data: { title: 'About', titleTemplate: null },
			isHome: false,
			pageTitle: 'About',
			siteTitle,
			tagline,
			separator
		});
		expect(out).toBe('About');
	});

	it('applies a per-page template above everything else', () => {
		const out = resolveTitle({
			data: { title: 'About', titleTemplate: '%s :: %siteTitle%' },
			isHome: false,
			pageTitle: 'About',
			siteTitle,
			tagline,
			separator,
			globalTemplate: '%s | %siteTitle%'
		});
		expect(out).toBe('About :: Baseline');
	});

	it('keeps the titleless home baked-in, ignoring a global template', () => {
		const out = resolveTitle({
			data: {},
			isHome: true,
			pageTitle: siteTitle,
			siteTitle,
			tagline,
			separator,
			globalTemplate: '%s | %siteTitle%'
		});
		expect(out).toBe('Baseline – Skip the setup');
	});

	it('applies the global template on a non-home page', () => {
		const out = resolveTitle({
			data: { title: 'About' },
			isHome: false,
			pageTitle: 'About',
			siteTitle,
			tagline,
			separator,
			globalTemplate: '%s | %siteTitle%'
		});
		expect(out).toBe('About | Baseline');
	});

	it('falls back to the legacy page–site composition with no template', () => {
		const out = resolveTitle({
			data: { title: 'About' },
			isHome: false,
			pageTitle: 'About',
			siteTitle,
			tagline,
			separator
		});
		expect(out).toBe('About – Baseline');
	});

	it('stays bare when the page title equals the site title', () => {
		const out = resolveTitle({
			data: { title: 'Baseline' },
			isHome: false,
			pageTitle: 'Baseline',
			siteTitle,
			tagline,
			separator
		});
		expect(out).toBe('Baseline');
	});

	it('composes the legacy home title with no template', () => {
		const out = resolveTitle({
			data: {},
			isHome: true,
			pageTitle: siteTitle,
			siteTitle,
			tagline,
			separator
		});
		expect(out).toBe('Baseline – Skip the setup');
	});
});
