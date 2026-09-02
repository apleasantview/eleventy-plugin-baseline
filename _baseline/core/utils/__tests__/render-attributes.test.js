import { describe, expect, it } from 'vitest';

import { renderAttributes } from '../render-attributes.js';

describe('renderAttributes', () => {
	it('returns nothing at all when there is nothing to render', () => {
		expect(renderAttributes({})).toBe('');
		expect(renderAttributes()).toBe('');
	});

	// The leading space is the caller's contract: `<script${renderAttributes(a)}>`
	// has to work with and without attributes.
	it('leads with a space when there is something to render', () => {
		expect(renderAttributes({ nonce: 'abc' })).toBe(' nonce="abc"');
	});

	// `defer`, `async`, `hidden`: the attribute is the message, the value is noise.
	it('renders true as a bare attribute', () => {
		expect(renderAttributes({ defer: true })).toBe(' defer');
	});

	// So a caller can toggle one with a value instead of building the map
	// conditionally.
	it('drops false, null and undefined', () => {
		expect(renderAttributes({ defer: false, nonce: null, type: undefined })).toBe('');
	});

	it('drops an empty value unless it is named in keepEmpty', () => {
		expect(renderAttributes({ alt: '' })).toBe('');
		expect(renderAttributes({ alt: '' }, ['alt'])).toBe(' alt=""');
	});

	it('keeps insertion order and renders several', () => {
		expect(renderAttributes({ type: 'module', defer: true, nonce: 'abc' })).toBe(' type="module" defer nonce="abc"');
	});

	// Zero is a value, not an absence.
	it('renders a numeric zero', () => {
		expect(renderAttributes({ width: 0 })).toBe(' width="0"');
	});
});
