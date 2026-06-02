import { describe, it, expect } from 'vitest';
import { titleCaseSlug } from '../title-case-slug.js';

describe('titleCaseSlug', () => {
	it('title-cases a hyphenated slug', () => {
		expect(titleCaseSlug('core-reference')).toBe('Core Reference');
	});

	it('treats underscores as word breaks too', () => {
		expect(titleCaseSlug('how_to')).toBe('How To');
	});
});
