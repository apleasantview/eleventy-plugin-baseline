import { describe, it, expect } from 'vitest';
import { parseHTML } from 'linkedom';
import { extractGraph } from '../content-graph/extractors.js';

function extract(html) {
	const { document } = parseHTML(`<!doctype html><html><body><main><article>${html}</article></main></body></html>`);
	return extractGraph(document, { url: '/test/', knownOrigins: new Set() });
}

describe('extractSections', () => {
	it('roots at H2 and pairs each heading with its prose', () => {
		const { node } = extract(`
			<h2 id="one">One</h2>
			<p>First section prose.</p>
			<h2 id="two">Two</h2>
			<p>Second section prose.</p>
		`);

		expect(node.sections).toHaveLength(2);
		expect(node.sections[0]).toEqual({
			heading: { level: 2, text: 'One', id: 'one' },
			text: 'First section prose.'
		});
		expect(node.sections[1].heading.text).toBe('Two');
		expect(node.sections[1].text).toBe('Second section prose.');
	});

	it('folds H3 and deeper into the parent section', () => {
		const { node } = extract(`
			<h2 id="parent">Parent</h2>
			<p>Lead.</p>
			<h3 id="child">Child</h3>
			<p>Child prose.</p>
		`);

		expect(node.sections).toHaveLength(1);
		expect(node.sections[0].text).toBe('Lead. Child Child prose.');
	});

	it('ignores H1 entirely (does not open or fold)', () => {
		const { node } = extract(`
			<h1>Title</h1>
			<p>Lead paragraph.</p>
			<h2 id="real">Real Section</h2>
			<p>Body.</p>
			<h1>Stray</h1>
			<p>After stray.</p>
		`);

		expect(node.sections).toHaveLength(1);
		expect(node.sections[0].heading.text).toBe('Real Section');
		expect(node.sections[0].text).not.toContain('Stray');
		expect(node.sections[0].text).not.toContain('Title');
		expect(node.sections[0].text).toBe('Body. After stray.');
	});

	it('drops pre-H2 content (excerpt covers the lead)', () => {
		const { node } = extract(`
			<p>Lead before any heading.</p>
			<h2 id="first">First</h2>
			<p>Section prose.</p>
		`);

		expect(node.sections).toHaveLength(1);
		expect(node.sections[0].text).toBe('Section prose.');
		expect(node.excerpt).toBe('Lead before any heading.');
	});

	it('returns an empty list when there are no H2s', () => {
		const { node } = extract(`
			<h1>Only Title</h1>
			<p>Just prose.</p>
		`);

		expect(node.sections).toEqual([]);
	});

	it('slugifies missing heading ids', () => {
		const { node } = extract(`
			<h2>No Id Here</h2>
			<p>Body.</p>
		`);

		expect(node.sections[0].heading.id).toBe('no-id-here');
	});

	it('collapses whitespace in the text projection', () => {
		const { node } = extract(`
			<h2 id="w">W</h2>
			<p>One.</p>
			<p>Two.</p>
		`);

		expect(node.sections[0].text).toBe('One. Two.');
	});
});

describe('extractLinks rel', () => {
	it('returns an empty array when no rel attribute is set', () => {
		const { edges } = extract(`<p><a href="/x/">link</a></p>`);
		expect(edges[0].rel).toEqual([]);
	});

	it('tokenises the rel attribute on whitespace', () => {
		const { edges } = extract(`<p><a href="/x/" rel="nofollow sponsored">link</a></p>`);
		expect(edges[0].rel).toEqual(['nofollow', 'sponsored']);
	});

	it('lowercases and dedupes tokens', () => {
		const { edges } = extract(`<p><a href="/x/" rel="NOFOLLOW nofollow  UGC">link</a></p>`);
		expect(edges[0].rel).toEqual(['nofollow', 'ugc']);
	});
});
