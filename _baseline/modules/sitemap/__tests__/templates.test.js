import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nunjucks from 'nunjucks';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templateDir = path.join(__dirname, '..', 'templates');

const core = fs.readFileSync(path.join(templateDir, 'sitemap-core.html'), 'utf-8');
const index = fs.readFileSync(path.join(templateDir, 'sitemap-index.html'), 'utf-8');

const SITE_URL = 'https://www.example.com/';

/**
 * Render a sitemap template the way Eleventy would, with a faithful stand-in
 * for HtmlBasePlugin's `htmlBaseUrl`.
 *
 * The default base is `/` on purpose. That is what the filter falls back to
 * when another plugin registers HtmlBasePlugin with no options and wins the
 * name, and the real filter short-circuits on it (`HtmlBasePlugin.js:92`).
 * So a template that calls the filter bare gets its URLs back untouched here,
 * exactly as it did in production. Passing the base is what makes it immune.
 */
function render(template, data, { defaultBase = '/' } = {}) {
	const env = new nunjucks.Environment(null, { autoescape: false });

	env.addFilter('htmlBaseUrl', (url, baseOverride) => {
		const base = baseOverride || defaultBase;
		if (base === '/') return url;
		return new URL(url, base).href;
	});

	return env.renderString(template, {
		date: { toUTCISO: (d) => new Date(d).toISOString() },
		...data
	});
}

function locs(xml) {
	return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
}

function alternates(xml) {
	return [...xml.matchAll(/hreflang="([^"]*)" href="([^"]*)"/g)].map((m) => ({
		hreflang: m[1],
		href: m[2]
	}));
}

function page(url, data = {}) {
	return { url, date: undefined, data };
}

describe('sitemap-core template', () => {
	const base = {
		siteUrl: SITE_URL,
		defaultLanguage: 'en',
		noindex: false,
		collections: { all: [page('/'), page('/about/')] }
	};

	it('emits absolute locations even when the shared filter has been neutralised', () => {
		const xml = render(core, base);

		expect(locs(xml)).toEqual(['https://www.example.com/', 'https://www.example.com/about/']);
	});

	it('drops a page carrying noindex', () => {
		const xml = render(core, {
			...base,
			collections: { all: [page('/'), page('/secret/', { noindex: true })] }
		});

		expect(locs(xml)).toEqual(['https://www.example.com/']);
	});

	it('drops a page carrying sitemap.ignore', () => {
		const xml = render(core, {
			...base,
			collections: { all: [page('/'), page('/hidden/', { sitemap: { ignore: true } })] }
		});

		expect(locs(xml)).toEqual(['https://www.example.com/']);
	});

	it('drops a page excluded from collections, and one with no url', () => {
		const xml = render(core, {
			...base,
			collections: {
				all: [
					page('/'),
					page('/robots.txt', { eleventyExcludeFromCollections: true }),
					page(false, { title: 'a permalink:false record' })
				]
			}
		});

		expect(locs(xml)).toEqual(['https://www.example.com/']);
	});

	it('emits nothing when the site is noindex', () => {
		const xml = render(core, { ...base, noindex: true });

		expect(locs(xml)).toEqual([]);
		expect(xml).toContain('</urlset>');
	});

	it('carries changefreq and priority through, and omits them when unset', () => {
		const xml = render(core, {
			...base,
			collections: {
				all: [page('/'), page('/news/', { sitemap: { changefreq: 'daily', priority: 0.8 } })]
			}
		});

		expect(xml).toContain('<changefreq>daily</changefreq>');
		expect(xml).toContain('<priority>0.8</priority>');
		expect(xml.match(/<changefreq>/g)).toHaveLength(1);
	});

	describe('multilingual', () => {
		const translationsMap = {
			home: {
				en: { url: '/', lang: 'en', isDefaultLang: true },
				nl: { url: '/nl/', lang: 'nl', isDefaultLang: false }
			}
		};

		const multi = {
			siteUrl: SITE_URL,
			defaultLanguage: 'en',
			noindex: false,
			isMultilingual: true,
			collections: {
				translationsMap,
				all: [
					page('/', { lang: 'en', translationKey: 'home' }),
					page('/nl/', { lang: 'nl', translationKey: 'home' })
				]
			}
		};

		it('keeps only the pages belonging to this language', () => {
			const en = render(core, { ...multi, sitemapLang: 'en' });
			const nl = render(core, { ...multi, sitemapLang: 'nl' });

			expect(locs(en)).toEqual(['https://www.example.com/']);
			expect(locs(nl)).toEqual(['https://www.example.com/nl/']);
		});

		it('falls back to the default language for a page that declares none', () => {
			const xml = render(core, {
				...multi,
				sitemapLang: 'en',
				collections: { ...multi.collections, all: [page('/untagged/')] }
			});

			expect(locs(xml)).toEqual(['https://www.example.com/untagged/']);
		});

		it('emits absolute hreflang alternates, with x-default on the default language', () => {
			const xml = render(core, { ...multi, sitemapLang: 'en' });

			expect(alternates(xml)).toEqual([
				{ hreflang: 'en', href: 'https://www.example.com/' },
				{ hreflang: 'x-default', href: 'https://www.example.com/' },
				{ hreflang: 'nl', href: 'https://www.example.com/nl/' }
			]);
		});
	});
});

describe('sitemap-index template', () => {
	const base = {
		siteUrl: SITE_URL,
		noindex: false,
		languages: { en: {}, nl: {} }
	};

	it('emits absolute, root-relative locations for each language', () => {
		const xml = render(index, base);

		expect(locs(xml)).toEqual([
			'https://www.example.com/en/sitemap.xml',
			'https://www.example.com/nl/sitemap.xml'
		]);
	});

	it('emits nothing when the site is noindex', () => {
		const xml = render(index, { ...base, noindex: true });

		expect(locs(xml)).toEqual([]);
		expect(xml).toContain('</sitemapindex>');
	});
});

describe('the regression these templates exist to prevent', () => {
	it('would ship relative locations if the base were not passed explicitly', () => {
		// The same render, with the argument stripped from the filter call. This is
		// what both sitemap templates did until 2026-09-02, and what shipped on any
		// site where eleventy-plugin-rss registered HtmlBasePlugin after Baseline.
		const bare = core.replace(/htmlBaseUrl\(siteUrl\)/g, 'htmlBaseUrl');

		const xml = render(bare, {
			siteUrl: SITE_URL,
			defaultLanguage: 'en',
			noindex: false,
			collections: { all: [page('/about/')] }
		});

		expect(locs(xml)).toEqual(['/about/']);
	});
});
