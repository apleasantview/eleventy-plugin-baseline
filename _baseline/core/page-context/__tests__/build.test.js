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

// Drive the public builder and capture what it registers in the slug index.
// This guards the monolingual wikilink regression: registration was gated on
// `isDefaultLang === true`, but that flag is set only by the multilang module,
// so a single-language site registered nothing and every wikilink missed.
function registeredSlugs(pageInput) {
	const calls = [];
	const build = createPageContext({
		scope: { values: new Map() },
		slugIndex: { set: (slug, url, inputPath) => calls.push({ slug, url, inputPath }) },
		settings: { url: 'https://www.example.com' },
		runtime: {},
		options: {}
	});
	build({ page: pageInput, title: 'About' });
	return calls;
}

describe('slug index registration', () => {
	it('registers a slug on a monolingual page (isDefaultLang undefined)', () => {
		const calls = registeredSlugs({ url: '/about/', fileSlug: 'about', inputPath: './about.md' });
		expect(calls).toEqual([{ slug: 'about', url: '/about/', inputPath: './about.md' }]);
	});

	it('registers the default-language slug in a multilingual site', () => {
		const calls = registeredSlugs({ url: '/en/about/', fileSlug: 'about', isDefaultLang: true });
		expect(calls).toHaveLength(1);
		expect(calls[0].url).toBe('/en/about/');
	});

	it('skips a genuine non-default translation', () => {
		const calls = registeredSlugs({ url: '/nl/over/', fileSlug: 'over', isDefaultLang: false });
		expect(calls).toEqual([]);
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

describe('buildBreadcrumbs', () => {
	it('returns nothing without a section or url', () => {
		expect(buildBreadcrumbs({ section: [], url: '/docs/' })).toEqual([]);
		expect(buildBreadcrumbs({ section: ['docs'], url: undefined })).toEqual([]);
	});

	it('appends a leaf page as its own crumb, ancestors title-cased', () => {
		const crumbs = buildBreadcrumbs({
			section: ['docs', 'module'],
			url: '/docs/module/head/',
			title: 'head'
		});
		expect(crumbs).toEqual([
			{ label: 'Home', url: '/' },
			{ label: 'Docs', url: '/docs/' },
			{ label: 'Module', url: '/docs/module/' },
			{ label: 'head', url: '/docs/module/head/', current: true }
		]);
	});

	it('relabels the last segment when the page IS its section index', () => {
		const crumbs = buildBreadcrumbs({
			section: ['docs', 'module'],
			url: '/docs/module/',
			title: 'Modules'
		});
		expect(crumbs).toEqual([
			{ label: 'Home', url: '/' },
			{ label: 'Docs', url: '/docs/' },
			{ label: 'Modules', url: '/docs/module/', current: true }
		]);
	});

	it('prefixes every url with the language for a non-default language', () => {
		const crumbs = buildBreadcrumbs({
			section: ['docs', 'module'],
			url: '/nl/docs/module/head/',
			title: 'head',
			lang: 'nl',
			isDefaultLang: false
		});
		expect(crumbs[0]).toEqual({ label: 'Home', url: '/nl/' });
		expect(crumbs[2]).toEqual({ label: 'Module', url: '/nl/docs/module/' });
		expect(crumbs[3]).toEqual({ label: 'head', url: '/nl/docs/module/head/', current: true });
	});

	it('does not prefix when the language is absent or default', () => {
		const def = buildBreadcrumbs({ section: ['docs'], url: '/docs/', title: 'Docs', lang: 'en', isDefaultLang: true });
		expect(def[0].url).toBe('/');
		const none = buildBreadcrumbs({ section: ['docs'], url: '/docs/', title: 'Docs', lang: 'en' });
		expect(none[0].url).toBe('/');
	});
});
