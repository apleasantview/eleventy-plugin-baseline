import { describe, it, expect } from 'vitest';
import { relatedPostsFilter } from '../filters/related-posts.js';

// Nunjucks invokes filters with `this` bound to the template runtime,
// which exposes `this.ctx.page`. We simulate that with .call(thisArg).
const withPageUrl = (url) => ({ ctx: { page: { url } } });

const collection = [
	{ url: '/a/', title: 'A' },
	{ url: '/b/', title: 'B' },
	{ url: '/c/', title: 'C' }
];

describe('relatedPostsFilter', () => {
	it('filters the current page out when its url matches', () => {
		const result = relatedPostsFilter.call(withPageUrl('/b/'), collection);
		expect(result).toEqual([
			{ url: '/a/', title: 'A' },
			{ url: '/c/', title: 'C' }
		]);
	});

	it('returns the collection unchanged when no entry matches', () => {
		const result = relatedPostsFilter.call(withPageUrl('/z/'), collection);
		expect(result).toEqual(collection);
	});

	it('returns the collection unchanged when `this` is absent', () => {
		const result = relatedPostsFilter(collection);
		expect(result).toEqual(collection);
	});

	it('returns the collection unchanged when page has no url', () => {
		const result = relatedPostsFilter.call({ ctx: { page: {} } }, collection);
		expect(result).toEqual(collection);
	});

	it('handles an empty collection', () => {
		const result = relatedPostsFilter.call(withPageUrl('/a/'), []);
		expect(result).toEqual([]);
	});

	it('handles being called with no arguments', () => {
		const result = relatedPostsFilter.call(withPageUrl('/a/'));
		expect(result).toEqual([]);
	});
});
