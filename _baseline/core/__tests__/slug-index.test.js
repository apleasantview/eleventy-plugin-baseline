import { describe, it, expect } from 'vitest';
import { createSlugIndex } from '../slug-index.js';

// getScope keys a WeakMap on the config object, so any object is a valid stub.
// A fresh one per test keeps the scopes isolated.
const freshIndex = () => createSlugIndex({});

describe('createSlugIndex', () => {
	it('registers a slug and resolves it', () => {
		const index = freshIndex();
		index.set('about', '/about/', './src/about.md');
		expect(index.getBySlug('about')).toBe('/about/');
	});

	it('ignores a registration with no slug or no url', () => {
		const index = freshIndex();
		index.set('', '/about/', './src/about.md');
		index.set('about', '', './src/about.md');
		expect(index.getBySlug('about')).toBeUndefined();
	});

	it('accepts the same slug at the same url twice', () => {
		const index = freshIndex();
		index.set('about', '/about/', './src/about.md');
		expect(() => index.set('about', '/about/', './src/about.md')).not.toThrow();
	});

	it('throws when two different files claim one slug', () => {
		const index = freshIndex();
		index.set('about', '/about/', './src/about.md');
		expect(() => index.set('about', '/info/', './src/info.md')).toThrow(/slug collision: "about"/);
	});

	// The case that must keep failing. A template paginating a collection emits
	// many urls from one inputPath, exactly like a segmented page does, so the
	// relaxation below cannot key on the inputPath alone. Duplicate slugs across
	// collection entries are an authoring error.
	it('throws when one paginating template claims a slug twice', () => {
		const index = freshIndex();
		index.set('dupe', '/records/one/', './src/records-single.njk');
		expect(() => index.set('dupe', '/records/two/', './src/records-single.njk')).toThrow(
			/slug collision: "dupe"/
		);
	});

	// Segmentation: every part inherits the same front matter, so every part
	// claims the same slug. The first part wins, so [[slug]] lands on part one.
	it('keeps the first registration for later parts of a segmented page', () => {
		const index = freshIndex();
		index.set('story', '/story/', './src/story.md', { segmented: true });
		expect(() =>
			index.set('story', '/story/2/', './src/story.md', { segmented: true })
		).not.toThrow();
		expect(index.getBySlug('story')).toBe('/story/');
	});

	it('still throws for a segmented page colliding with a different file', () => {
		const index = freshIndex();
		index.set('story', '/story/', './src/story.md', { segmented: true });
		expect(() =>
			index.set('story', '/other/', './src/other.md', { segmented: true })
		).toThrow(/slug collision: "story"/);
	});

	it('throws when the existing entry has no inputPath to compare against', () => {
		const index = freshIndex();
		index.set('story', '/story/');
		expect(() =>
			index.set('story', '/story/2/', './src/story.md', { segmented: true })
		).toThrow(/slug collision: "story"/);
	});
});
