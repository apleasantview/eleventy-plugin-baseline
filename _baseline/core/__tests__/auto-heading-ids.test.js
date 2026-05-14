import { describe, it, expect, beforeEach } from 'vitest';
import markdownit from 'markdown-it';
import markdownItAttrs from 'markdown-it-attrs';
import { autoHeadingIds } from '../markdown/auto-heading-ids.js';
import { slugify } from '../utils/slugify.js';

function makeMd() {
	return markdownit().use(markdownItAttrs).use(autoHeadingIds, { slugify });
}

describe('auto-heading-ids', () => {
	let md;

	beforeEach(() => {
		md = makeMd();
	});

	it('assigns a slugified id to a single heading', () => {
		expect(md.render('## Hello World').trim()).toBe(
			'<h2 id="hello-world">Hello World</h2>'
		);
	});

	it('suffixes duplicates WordPress-style', () => {
		const out = md.render('## Hello\n\n## Hello\n\n## Hello').trim();
		expect(out).toContain('<h2 id="hello">Hello</h2>');
		expect(out).toContain('<h2 id="hello-2">Hello</h2>');
		expect(out).toContain('<h2 id="hello-3">Hello</h2>');
	});

	it('respects explicit ids from markdown-it-attrs', () => {
		const out = md.render('## Hello World {#custom}\n\n## Hello World').trim();
		expect(out).toContain('<h2 id="custom">Hello World</h2>');
		expect(out).toContain('<h2 id="hello-world">Hello World</h2>');
	});

	it('seeds dedup with manual ids so autos skip them', () => {
		const out = md.render('## Hello {#hello}\n\n## Hello').trim();
		expect(out).toContain('<h2 id="hello">Hello</h2>');
		expect(out).toContain('<h2 id="hello-2">Hello</h2>');
	});

	it('skips over a manual id that collides with a later auto suffix', () => {
		const src = '## Hello\n\n## Hello\n\n## Hello {#hello-2}\n\n## Hello';
		const out = md.render(src).trim();
		// First auto: hello. Second auto: hello-2 is taken by H3, so skips to hello-3.
		// Fourth auto: hello-4.
		const ids = [...out.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
		expect(ids).toEqual(['hello', 'hello-3', 'hello-2', 'hello-4']);
	});

	it('uses plain text for headings with inline markup', () => {
		expect(md.render('## Hello *world*').trim()).toBe(
			'<h2 id="hello-world">Hello <em>world</em></h2>'
		);
	});

	it('does not fold an attrs class into the id', () => {
		const out = md.render('## Hello world {.lead}').trim();
		expect(out).toContain('id="hello-world"');
		expect(out).toContain('class="lead"');
	});

	it('uses inline code content as part of the slug', () => {
		expect(md.render('## The `foo` API').trim()).toBe(
			'<h2 id="the-foo-api">The <code>foo</code> API</h2>'
		);
	});

	it('uses image alt text as part of the slug', () => {
		expect(md.render('## ![Implementation diagram](impl.png)').trim()).toContain(
			'id="implementation-diagram"'
		);
	});

	it('leaves empty headings without an id', () => {
		const out = md.render('##\n').trim();
		expect(out).not.toContain('id=');
	});

	it('resets the counter per render', () => {
		md.render('## Hello\n\n## Hello');
		const second = md.render('## Hello').trim();
		expect(second).toBe('<h2 id="hello">Hello</h2>');
	});

	it('throws when slugify is missing', () => {
		const bare = markdownit();
		expect(() => bare.use(autoHeadingIds, {})).toThrow(/slugify/);
	});
});
