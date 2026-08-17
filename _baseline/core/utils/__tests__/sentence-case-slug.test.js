import { describe, it, expect } from 'vitest';
import { sentenceCaseSlug } from '../sentence-case-slug.js';

describe('sentenceCaseSlug', () => {
	it('capitalises the first word only', () => {
		expect(sentenceCaseSlug('core-reference')).toBe('Core reference');
	});

	it('treats underscores as word breaks too', () => {
		expect(sentenceCaseSlug('how_to')).toBe('How to');
	});

	it('leaves a single word alone but for its first letter', () => {
		expect(sentenceCaseSlug('tutorial')).toBe('Tutorial');
	});

	it('returns an empty string for an empty slug', () => {
		expect(sentenceCaseSlug('')).toBe('');
		expect(sentenceCaseSlug('--')).toBe('');
	});
});
