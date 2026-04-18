import { describe, it, expect, vi, afterEach } from 'vitest';
import { getVerbose, logIfVerbose, warnIfVerbose } from '../logging.js';

describe('getVerbose', () => {
	it('returns true when globalData._baseline.verbose is truthy', () => {
		const config = { globalData: { _baseline: { verbose: true } } };
		expect(getVerbose(config)).toBe(true);
	});

	it('returns false when verbose is false', () => {
		const config = { globalData: { _baseline: { verbose: false } } };
		expect(getVerbose(config)).toBe(false);
	});

	it('returns false when the optional chain bottoms out', () => {
		expect(getVerbose({})).toBe(false);
		expect(getVerbose({ globalData: {} })).toBe(false);
	});
});

describe('logIfVerbose', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('calls console.log with the INFO prefix when verbose is true', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		logIfVerbose(true, 'hello', 'extra');
		expect(spy).toHaveBeenCalledWith(
			'[eleventy-plugin-baseline] INFO hello',
			'extra'
		);
	});

	it('does not call console.log when verbose is false', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		logIfVerbose(false, 'hello');
		expect(spy).not.toHaveBeenCalled();
	});
});

describe('warnIfVerbose', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('calls console.warn with the WARN prefix when verbose is true', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		warnIfVerbose(true, 'watch out', 'extra');
		expect(spy).toHaveBeenCalledWith(
			'[eleventy-plugin-baseline] WARN watch out',
			'extra'
		);
	});

	it('does not call console.warn when verbose is false', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		warnIfVerbose(false, 'watch out');
		expect(spy).not.toHaveBeenCalled();
	});
});
