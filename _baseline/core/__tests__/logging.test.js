import { describe, it, expect, vi, afterEach } from 'vitest';
import { createLogger } from '../logging/index.js';

// kleur auto-disables colour in non-TTY environments (Vitest's default runner),
// so prefixes are plain strings in these assertions.

describe('createLogger', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('uses the root [baseline] prefix when namespace is null', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const log = createLogger(null);
		log.warn('hello');
		expect(spy).toHaveBeenCalledWith('[baseline]', 'hello');
	});

	it('uses [baseline:namespace] prefix when a namespace is provided', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const log = createLogger('head');
		log.warn('hello');
		expect(spy).toHaveBeenCalledWith('[baseline/head]', 'hello');
	});

	it('info is silent when verbose is false', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const log = createLogger(null, { verbose: false });
		log.info('hello');
		expect(spy).not.toHaveBeenCalled();
	});

	it('info emits console.log when verbose is true', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const log = createLogger(null, { verbose: true });
		log.info('hello', 'extra');
		expect(spy).toHaveBeenCalledWith('[baseline]', 'hello', 'extra');
	});

	it('warn emits console.warn regardless of verbose', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const log = createLogger(null, { verbose: false });
		log.warn('watch out');
		expect(spy).toHaveBeenCalledWith('[baseline]', 'watch out');
	});

	it('error emits console.error regardless of verbose', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const log = createLogger(null, { verbose: false });
		log.error('boom');
		expect(spy).toHaveBeenCalledWith('[baseline]', 'boom');
	});

	it('passes variadic args through verbatim', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const log = createLogger('mod');
		const payload = { a: 1 };
		log.warn('got', payload, 42);
		expect(spy).toHaveBeenCalledWith('[baseline/mod]', 'got', payload, 42);
	});

	it('prefix is the first argument, not concatenated', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const log = createLogger('mod');
		log.warn('hello');
		const [first, second] = spy.mock.calls[0];
		expect(first).toBe('[baseline/mod]');
		expect(second).toBe('hello');
	});
});
