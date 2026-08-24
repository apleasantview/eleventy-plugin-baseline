import { describe, it, expect } from 'vitest';
import { translationGroupKey } from '../translation-group-key.js';

describe('translationGroupKey', () => {
	it('leaves an unsegmented page on its own key', () => {
		expect(translationGroupKey('about', undefined)).toBe('about');
	});

	// Part one keeps the bare key, so a translation that was never split still
	// pairs with part one of one that was.
	it('leaves part one on the bare key', () => {
		expect(translationGroupKey('story', 0)).toBe('story');
	});

	it('groups later parts per part', () => {
		expect(translationGroupKey('story', 1)).toBe('story#2');
		expect(translationGroupKey('story', 2)).toBe('story#3');
	});

	it('has no group without a translationKey', () => {
		expect(translationGroupKey(undefined, 1)).toBeUndefined();
	});
});
