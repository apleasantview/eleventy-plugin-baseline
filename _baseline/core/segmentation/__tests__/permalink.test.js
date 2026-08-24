import { describe, it, expect } from 'vitest';
import { isSegmentable, baseFromFilePathStem, numberUnder } from '../permalink.js';

describe('isSegmentable', () => {
	it('accepts absence, a string, and a function', () => {
		expect(isSegmentable(undefined)).toBe(true);
		expect(isSegmentable('/blog/story/')).toBe(true);
		expect(isSegmentable(() => '/blog/story/')).toBe(true);
	});

	// A function is how any site with a URL scheme of its own sets permalinks,
	// including this plugin's own docs site. Refusing them ruled out most real
	// sites, which is how the first version of this guard was wrong.
	it('refuses only a page that is never written', () => {
		expect(isSegmentable(false)).toBe(false);
	});
});

describe('baseFromFilePathStem', () => {
	it('keeps the directories a page sits in', () => {
		expect(baseFromFilePathStem('/blog/story')).toBe('/blog/story/');
	});

	it('drops the index segment, as Eleventy does', () => {
		expect(baseFromFilePathStem('/blog/index')).toBe('/blog/');
		expect(baseFromFilePathStem('/index')).toBe('/');
	});
});

describe('numberUnder', () => {
	it('leaves part one exactly as the site asked for it', () => {
		expect(numberUnder('/blog/story/', 0)).toBe('/blog/story/');
		expect(numberUnder('/blog/story.html', 0)).toBe('/blog/story.html');
	});

	it('numbers the rest underneath', () => {
		expect(numberUnder('/blog/story/', 1)).toBe('/blog/story/2/');
		expect(numberUnder('/blog/story/', 2)).toBe('/blog/story/3/');
	});

	it('drops a file extension before numbering, rather than nesting under it', () => {
		expect(numberUnder('/blog/story.html', 1)).toBe('/blog/story/2/');
	});
});
