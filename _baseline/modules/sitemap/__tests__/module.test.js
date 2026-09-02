import { describe, expect, it } from 'vitest';
import { sitemapCore } from '../index.js';

/**
 * Minimal stand-in for the two UserConfig methods this module touches.
 * Records what was registered so the assertions can read it back.
 */
function stubConfig() {
	const templates = [];
	return {
		templates,
		addGlobalData() {},
		addTemplate(name, _content, data) {
			templates.push({ name, data });
		}
	};
}

function run(settings, options = {}) {
	const eleventyConfig = stubConfig();
	sitemapCore(eleventyConfig, {
		state: { settings, options },
		log: { info() {} }
	});
	return eleventyConfig.templates;
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

	it('hands the templates their own site data rather than trusting a settings global', () => {
		const templates = run({ url: 'https://www.example.com/', defaultLanguage: 'en', noindex: true, languages });

		expect(templates[0].data).toMatchObject({
			siteUrl: 'https://www.example.com/',
			defaultLanguage: 'en',
			noindex: true
		});
	});
});
