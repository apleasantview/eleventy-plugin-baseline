import { describe, it, expect } from 'vitest';
import { tagPrepassConfig, isPrepassConfig } from '../prepass-channel.js';

// Stand-ins for Eleventy's config object. Only identity matters: the registry
// keys a WeakMap on it and reads nothing off it.
const config = () => ({});

describe('the pre-pass channel', () => {
	it('answers for a tagged config', () => {
		const nested = config();
		tagPrepassConfig(nested);

		expect(isPrepassConfig(nested)).toBe(true);
	});

	it('answers false for an untagged one', () => {
		expect(isPrepassConfig(config())).toBe(false);
	});

	// The question the env var got wrong. Project B's outer build loads its
	// config while project A's pre-pass is still running, and must not be told
	// it is the nested one.
	it('keeps two builds in one process apart', () => {
		const outerA = config();
		const nestedA = config();
		const outerB = config();

		tagPrepassConfig(nestedA);

		expect([isPrepassConfig(outerA), isPrepassConfig(nestedA), isPrepassConfig(outerB)]).toEqual([
			false,
			true,
			false
		]);
	});

	// Called before the composition root has a config object in hand, which is
	// where the factory's own warnings are emitted from.
	it('answers false for nothing at all', () => {
		expect(isPrepassConfig(null)).toBe(false);
		expect(isPrepassConfig(undefined)).toBe(false);
	});
});
