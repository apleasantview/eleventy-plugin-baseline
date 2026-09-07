import { describe, it, expect } from 'vitest';
import { partEntries, buildPagebreak, applyPartLabel } from '../nav.js';

const bare = [{ next: undefined }, { next: undefined }, {}];
const labelled = [
	{ next: { label: 'Verder' } },
	{ next: { anchor: 'three', label: 'Part three' } },
	{}
];

describe('partEntries', () => {
	// Numbers are the floor: no copy, nothing to translate, and a bare marker
	// still leaves a template something to render. WordPress has done it this
	// way for twenty years.
	it('numbers the parts when no marker carried a label', () => {
		expect(partEntries(bare).map((entry) => entry.label)).toEqual(['1', '2', '3']);
	});

	// A part is named by the marker that introduced it, so part one keeps its
	// number and the labels land one place later.
	it('names a part after the marker that introduced it', () => {
		expect(partEntries(labelled).map((entry) => entry.label)).toEqual(['1', 'Verder', 'Part three']);
	});

	it('carries the anchor onto the part it points into', () => {
		expect(partEntries(labelled).map((entry) => entry.anchor)).toEqual([
			undefined,
			undefined,
			'three'
		]);
	});
});

describe('buildPagebreak', () => {
	const entries = partEntries(labelled);
	const hrefs = ['/story/', '/story/2/', '/story/3/'];

	it('numbers the current part from one and counts the whole set', () => {
		const out = buildPagebreak(entries, hrefs, 1);

		expect(out.number).toBe(2);
		expect(out.total).toBe(3);
	});

	it('marks the current part and no other', () => {
		const out = buildPagebreak(entries, hrefs, 1);

		expect(out.parts.map((part) => part.current)).toEqual([false, true, false]);
	});

	it('pairs each part with its url, label and anchor', () => {
		const out = buildPagebreak(entries, hrefs, 0);

		expect(out.parts[2]).toEqual({
			number: 3,
			label: 'Part three',
			anchor: 'three',
			url: '/story/3/',
			current: false
		});
	});

	it('offers the neighbours, and nothing past either end', () => {
		const first = buildPagebreak(entries, hrefs, 0);
		const last = buildPagebreak(entries, hrefs, 2);

		expect(first.previous).toBeUndefined();
		expect(first.next.number).toBe(2);
		expect(last.next).toBeUndefined();
		expect(last.previous.number).toBe(2);
	});

	it('survives a missing href set', () => {
		expect(buildPagebreak(entries, undefined, 0).parts[0].url).toBeUndefined();
	});
});

describe('applyPartLabel', () => {
	const entries = partEntries(labelled);
	const hrefs = ['/story/', '/story/2/', '/story/3/'];
	const title = 'The whole story';

	// Fixtures come through buildPagebreak rather than hand-rolled, so a change
	// to the shape it produces fails here instead of passing against a stale copy.
	const partOne = buildPagebreak(entries, hrefs, 0);
	const partTwo = buildPagebreak(entries, hrefs, 1);

	// Part one is the document. Qualifying it would name a part nobody chose to
	// be on, and it is the URL that carries the shared title in search results.
	it('leaves part one alone', () => {
		expect(applyPartLabel(title, partOne)).toBe(title);
	});

	// The label leads so that SERP truncation eats the document title's tail
	// rather than the one word telling two parts apart.
	it('leads with the label on a later part', () => {
		expect(applyPartLabel(title, partTwo)).toBe('Verder: The whole story');
	});

	// `_pagebreak` reaches this twice: once as a placeholder string while
	// Eleventy discovers dependencies, then as the real object.
	it('ignores the placeholder string from the dependency-discovery pass', () => {
		expect(applyPartLabel(title, '__PLACEHOLDER__')).toBe(title);
	});

	it('leaves an unsplit page alone', () => {
		expect(applyPartLabel(title, undefined)).toBe(title);
	});

	// buildPagebreak always flags one part current. Anything else reaching here
	// is malformed, and the number is the second source of truth for which part
	// this is.
	it('falls back to the numbered part when none is flagged current', () => {
		const noneCurrent = {
			...partTwo,
			parts: partTwo.parts.map((part) => ({ ...part, current: false }))
		};

		expect(applyPartLabel(title, noneCurrent)).toBe('Verder: The whole story');
	});

	it('leaves the title alone when the part it lands on has no label', () => {
		const unlabelled = {
			...partTwo,
			parts: partTwo.parts.map((part) => ({ ...part, label: '' }))
		};

		expect(applyPartLabel(title, unlabelled)).toBe(title);
	});

	it('leaves the title alone when parts are missing entirely', () => {
		expect(applyPartLabel(title, { number: 2, total: 3 })).toBe(title);
	});
});
