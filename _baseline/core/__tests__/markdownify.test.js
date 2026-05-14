import { describe, it, expect } from 'vitest';
import { markdownFilter } from '../markdown/markdownify.js';

describe('markdownFilter', () => {
	it('renders bold to <strong>', () => {
		expect(markdownFilter('**hello**')).toBe('<strong>hello</strong>');
	});

	it('renders italic to <em>', () => {
		expect(markdownFilter('*hello*')).toBe('<em>hello</em>');
	});

	it('renders an inline link to <a href>', () => {
		expect(markdownFilter('[text](https://example.com)')).toBe(
			'<a href="https://example.com">text</a>'
		);
	});

	it('returns an empty string for empty input', () => {
		expect(markdownFilter('')).toBe('');
	});

	it('returns an empty string for null or undefined', () => {
		expect(markdownFilter(null)).toBe('');
		expect(markdownFilter(undefined)).toBe('');
	});

	it('does not wrap output in a <p> tag', () => {
		expect(markdownFilter('hello')).not.toMatch(/<\/?p>/);
	});
});
