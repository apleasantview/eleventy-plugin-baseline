import { describe, it, expect } from 'vitest';
import debug from '../../navigator/utils/debug.js';

const sample = { b: 2, a: 1, c: 3 };

describe('_inspect filter', () => {
	it('returns a string for a simple object', () => {
		expect(typeof debug.inspect(sample)).toBe('string');
	});

	it('output includes the object keys and values', () => {
		const out = debug.inspect(sample);
		expect(out).toContain('a');
		expect(out).toContain('1');
		expect(out).toContain('b');
		expect(out).toContain('2');
	});
});

describe('_json filter', () => {
	it('produces compact JSON by default', () => {
		expect(debug.json({ a: 1, b: 2 })).toBe('{"a":1,"b":2}');
	});

	it('respects a custom space argument', () => {
		const out = debug.json({ a: 1 }, 2);
		expect(out).toBe('{\n  "a": 1\n}');
	});
});

describe('_keys filter', () => {
	it('returns own keys sorted alphabetically', () => {
		expect(debug.keys(sample)).toEqual(['a', 'b', 'c']);
	});

	it('returns [] for an empty object', () => {
		expect(debug.keys({})).toEqual([]);
	});
});
