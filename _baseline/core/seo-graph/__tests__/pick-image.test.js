import { describe, expect, it } from 'vitest';
import { isAbsoluteImageUrl, pickImage } from '../pick-image.js';

describe('pickImage', () => {
	it('takes the first usable candidate and normalises a bare string', () => {
		expect(pickImage('/a.jpg', '/b.jpg')).toEqual({ url: '/a.jpg' });
		expect(pickImage(undefined, { url: '/b.jpg', alt: 'B' })).toEqual({ url: '/b.jpg', alt: 'B' });
	});

	// The bug this replaces. `??` falls through on nullish only, so an
	// unresolved eleventyComputed key (a function) won the chain and then
	// failed the `.url` test, and the page got no image rather than the
	// site default.
	it('skips a value that is not an image and keeps walking the chain', () => {
		const unresolvedComputed = () => '/computed.jpg';

		expect(pickImage(unresolvedComputed, '/site.jpg')).toEqual({ url: '/site.jpg' });
		expect(pickImage({ alt: 'no url here' }, '/site.jpg')).toEqual({ url: '/site.jpg' });
		expect(pickImage(42, '/site.jpg')).toEqual({ url: '/site.jpg' });
	});

	it('treats nullish and empty as absent, not as a decision', () => {
		expect(pickImage(null, '/site.jpg')).toEqual({ url: '/site.jpg' });
		expect(pickImage(undefined, '/site.jpg')).toEqual({ url: '/site.jpg' });
		expect(pickImage('', '/site.jpg')).toEqual({ url: '/site.jpg' });
		expect(pickImage('   ', '/site.jpg')).toEqual({ url: '/site.jpg' });
		expect(pickImage({ url: '' }, '/site.jpg')).toEqual({ url: '/site.jpg' });
	});

	// The replacement for `ogImage: ''`, which suppressed by accident.
	it('stops the chain on an explicit false', () => {
		expect(pickImage(false, '/site.jpg')).toBeUndefined();
		expect(pickImage(undefined, false, '/site.jpg')).toBeUndefined();
	});

	it('returns undefined when the whole chain is empty', () => {
		expect(pickImage()).toBeUndefined();
		expect(pickImage(undefined, null, '')).toBeUndefined();
	});
});

describe('isAbsoluteImageUrl', () => {
	it('accepts http and https', () => {
		expect(isAbsoluteImageUrl('https://www.example.com/a.jpg')).toBe(true);
		expect(isAbsoluteImageUrl('HTTP://www.example.com/a.jpg')).toBe(true);
	});

	it('rejects anything the JSON-LD graph would ship as authored', () => {
		expect(isAbsoluteImageUrl('/a.jpg')).toBe(false);
		expect(isAbsoluteImageUrl('a.jpg')).toBe(false);
		expect(isAbsoluteImageUrl('//www.example.com/a.jpg')).toBe(false);
		expect(isAbsoluteImageUrl(undefined)).toBe(false);
	});
});
