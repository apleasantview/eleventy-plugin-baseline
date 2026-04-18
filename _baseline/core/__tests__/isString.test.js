import { describe, it, expect } from 'vitest';
import isStringFilter from '../filters/isString.js';

describe('isStringFilter', () => {
	it('returns true for a plain string', () => {
		expect(isStringFilter('hello')).toBe(true);
	});

	it('returns true for an empty string', () => {
		expect(isStringFilter('')).toBe(true);
	});

	it('returns false for a number', () => {
		expect(isStringFilter(42)).toBe(false);
	});

	it('returns false for null', () => {
		expect(isStringFilter(null)).toBe(false);
	});

	it('returns false for undefined', () => {
		expect(isStringFilter(undefined)).toBe(false);
	});
});
