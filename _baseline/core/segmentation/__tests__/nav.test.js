import { describe, it, expect } from 'vitest';
import { partEntries, buildPagebreak } from '../nav.js';

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
