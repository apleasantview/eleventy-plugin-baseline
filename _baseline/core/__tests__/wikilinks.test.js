import { describe, it, expect, beforeEach } from 'vitest';
import markdownit from 'markdown-it';
import { wikilinks } from '../wikilinks.js';

function makeDeps({ slugs = {}, contexts = {}, translations = null } = {}) {
	return {
		slugIndex: {
			getBySlug: (slug) => slugs[slug]
		},
		pageContextRegistry: {
			getByKey: (url) => contexts[url]
		},
		translationMapStore: {
			get: () => translations
		}
	};
}

function render(md, src) {
	return md.render(src).trim();
}

describe('wikilinks', () => {
	let md;

	beforeEach(() => {
		md = markdownit();
	});

	it('renders a known slug as a link with class="wikilink" and entry.title', () => {
		md.use(
			wikilinks,
			makeDeps({
				slugs: { about: '/about/' },
				contexts: { '/about/': { entry: { title: 'About Us' } } }
			})
		);
		expect(render(md, '[[about]]')).toBe(
			'<p><a href="/about/" class="wikilink">About Us</a></p>'
		);
	});

	it('falls back to the raw label when entry.title is missing', () => {
		md.use(
			wikilinks,
			makeDeps({
				slugs: { about: '/about/' },
				contexts: { '/about/': { entry: {} } }
			})
		);
		expect(render(md, '[[About]]')).toBe(
			'<p><a href="/about/" class="wikilink">About</a></p>'
		);
	});

	it('renders unknown slugs as plain text', () => {
		md.use(wikilinks, makeDeps({ slugs: {} }));
		expect(render(md, '[[ghost]]')).toBe('<p>[[ghost]]</p>');
	});

	it('rejects nested brackets', () => {
		md.use(wikilinks, makeDeps({ slugs: { about: '/about/' } }));
		expect(render(md, '[[a[b]]')).toContain('[[a');
	});

	it('slugifies the label before lookup', () => {
		md.use(
			wikilinks,
			makeDeps({
				slugs: { 'about-us': '/about/' },
				contexts: { '/about/': { entry: { title: 'About' } } }
			})
		);
		expect(render(md, '[[About Us]]')).toBe(
			'<p><a href="/about/" class="wikilink">About</a></p>'
		);
	});

	it('does not match inside code spans', () => {
		md.use(wikilinks, makeDeps({ slugs: { about: '/about/' } }));
		expect(render(md, '`[[about]]`')).toBe('<p><code>[[about]]</code></p>');
	});

	describe('alias', () => {
		it('uses the pipe-separated alias as display text', () => {
			md.use(
				wikilinks,
				makeDeps({
					slugs: { about: '/about/' },
					contexts: { '/about/': { entry: { title: 'About' } } }
				})
			);
			expect(render(md, '[[about|click here]]')).toBe(
				'<p><a href="/about/" class="wikilink">click here</a></p>'
			);
		});

		it('trims whitespace around the alias', () => {
			md.use(
				wikilinks,
				makeDeps({
					slugs: { about: '/about/' },
					contexts: { '/about/': { entry: { title: 'About' } } }
				})
			);
			expect(render(md, '[[about |  click here  ]]')).toBe(
				'<p><a href="/about/" class="wikilink">click here</a></p>'
			);
		});
	});

	describe('anchor', () => {
		it('appends a slugified anchor to the href', () => {
			md.use(
				wikilinks,
				makeDeps({
					slugs: { about: '/about/' },
					contexts: { '/about/': { entry: { title: 'About' } } }
				})
			);
			expect(render(md, '[[about#Our Team]]')).toBe(
				'<p><a href="/about/#our-team" class="wikilink">About</a></p>'
			);
		});

		it('combines anchor with alias', () => {
			md.use(
				wikilinks,
				makeDeps({
					slugs: { about: '/about/' },
					contexts: { '/about/': { entry: { title: 'About' } } }
				})
			);
			expect(render(md, '[[about#team|the team]]')).toBe(
				'<p><a href="/about/#team" class="wikilink">the team</a></p>'
			);
		});
	});

	describe('lang hop', () => {
		const deps = () =>
			makeDeps({
				slugs: { about: '/en/about/' },
				contexts: {
					'/en/about/': {
						entry: { title: 'About' },
						page: { locale: { translationKey: 'about', lang: 'en', isDefaultLang: true } }
					}
				},
				translations: {
					about: {
						en: { url: '/en/about/', title: 'About' },
						nl: { url: '/nl/over/', title: 'Over' }
					}
				}
			});

		it('hops to the requested language and sets lang/hreflang attributes', () => {
			md.use(wikilinks, deps());
			expect(render(md, '[[about:nl]]')).toBe(
				'<p><a href="/nl/over/" class="wikilink" lang="nl" hreflang="nl">Over</a></p>'
			);
		});

		it('combines lang, anchor, and alias', () => {
			md.use(wikilinks, deps());
			expect(render(md, '[[about:nl#team|het team]]')).toBe(
				'<p><a href="/nl/over/#team" class="wikilink" lang="nl" hreflang="nl">het team</a></p>'
			);
		});

		it('renders plain text when the requested language has no translation', () => {
			md.use(wikilinks, deps());
			expect(render(md, '[[about:fr]]')).toBe('<p>[[about:fr]]</p>');
		});

		it('renders plain text when the page has no translationKey', () => {
			md.use(
				wikilinks,
				makeDeps({
					slugs: { about: '/about/' },
					contexts: { '/about/': { entry: { title: 'About' } } }
				})
			);
			expect(render(md, '[[about:nl]]')).toBe('<p>[[about:nl]]</p>');
		});
	});
});
