import { describe, expect, it } from 'vitest';
import { sitemapCore } from '../index.js';

/**
 * Minimal stand-in for the two UserConfig methods this module touches.
 * Records what was registered so the assertions can read it back.
 */
function stubConfig() {
	const templates = [];
	const globals = {};
	return {
		templates,
		globals,
		addGlobalData(key, value) {
			globals[key] = value;
		},
		addTemplate(name, _content, data) {
			templates.push({ name, data });
		}
	};
}

function register(settings, options = {}) {
	const eleventyConfig = stubConfig();
	sitemapCore(eleventyConfig, {
		state: { settings, options },
		log: { info() {} }
	});
	return eleventyConfig;
}

function run(settings, options = {}) {
	return register(settings, options).templates;
}

const languages = { en: {}, nl: {} };

describe('sitemapCore', () => {
	it('writes one flat sitemap when multilang is off', () => {
		const templates = run({ url: 'https://www.example.com/', defaultLanguage: 'en', languages });

		expect(templates.map((t) => t.data.permalink)).toEqual(['/sitemap.xml']);
	});

	it('writes one sitemap per language plus an index when multilang is on', () => {
		const templates = run(
			{ url: 'https://www.example.com/', defaultLanguage: 'en', languages },
			{ multilang: true }
		);

		expect(templates.map((t) => t.data.permalink)).toEqual([
			'en/sitemap.xml',
			'nl/sitemap.xml',
			'/sitemap.xml'
		]);
	});

	// `defaultLocale` is the documented alias, and this module used to read
	// `defaultLanguage` alone. A site that set only the alias got multilang
	// running and a single flat sitemap, with nothing to say why.
	it('partitions per language when the site sets defaultLocale alone', () => {
		const templates = run(
			{ url: 'https://www.example.com/', defaultLocale: 'en-GB', languages },
			{ multilang: true }
		);

		expect(templates.map((t) => t.data.permalink)).toEqual([
			'en/sitemap.xml',
			'nl/sitemap.xml',
			'/sitemap.xml'
		]);
	});

	// The registration wrote to `eleventyComputed.page.sitemap` until 2026-10-09
	// while the template read `item.data.sitemap`, so the resolved entry reached
	// nothing. The key the template reads is the assertion worth having.
	it('registers the resolved entry on the key the template reads', () => {
		const { globals } = register({ url: 'https://www.example.com/', defaultLanguage: 'en', languages });

		expect(Object.keys(globals)).toEqual(['eleventyComputed._sitemap']);

		const resolve = globals['eleventyComputed._sitemap']();

		expect(resolve({ page: {}, sitemap: { changefreq: 'daily' } })).toMatchObject({
			ignore: false,
			changefreq: 'daily'
		});
	});

	it('hands the templates their own site data rather than trusting a settings global', () => {
		const templates = run({ url: 'https://www.example.com/', defaultLanguage: 'en', noindex: true, languages });

		expect(templates[0].data).toMatchObject({
			siteUrl: 'https://www.example.com/',
			defaultLanguage: 'en',
			noindex: true
		});
	});
});
