import { describe, it, expect, vi, afterEach } from 'vitest';
import { createLogger } from '../index.js';

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

// The pre-pass gate had no tests, which is how the reference page came to claim
// the opposite of what the code does for a year. `info` and `warn` are both
// silenced while the inner Eleventy runs; only `error` is ungated, because a
// pre-pass that fails may be the only place it can say so.
describe('the pre-pass gate', () => {
	const PREPASS = 'BASELINE_PREPASS_ACTIVE';

	afterEach(() => {
		delete process.env[PREPASS];
		vi.restoreAllMocks();
	});

	it('silences info even when verbose is true', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		process.env[PREPASS] = '1';

		createLogger(null, { verbose: true }).info('hello');

		expect(spy).not.toHaveBeenCalled();
	});

	it('silences warn, which the reference page used to deny', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		process.env[PREPASS] = '1';

		createLogger(null).warn('hello');

		expect(spy).not.toHaveBeenCalled();
	});

	it('lets error through', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		process.env[PREPASS] = '1';

		createLogger(null).error('boom');

		expect(spy).toHaveBeenCalledWith('[baseline]', 'boom');
	});

	// The flag is read per call, not captured at construction, so a logger made
	// before the pre-pass starts is still gated during it.
	it('reads the flag per call rather than at construction', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const log = createLogger(null);

		log.warn('before');
		process.env[PREPASS] = '1';
		log.warn('during');
		delete process.env[PREPASS];
		log.warn('after');

		expect(spy).toHaveBeenCalledTimes(2);
		expect(spy.mock.calls.map((c) => c[1])).toEqual(['before', 'after']);
	});

	// `'0'` is truthy, so the check has to be an equality test. It is.
	it('treats the cleared value as not-in-prepass', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		process.env[PREPASS] = '0';

		createLogger(null).warn('hello');

		expect(spy).toHaveBeenCalled();
	});
});

// Eleventy's own `--quiet` used to silence Eleventy and leave Baseline talking.
describe('quiet mode', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('silences info when quiet is true, even with verbose on', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

		createLogger(null, { verbose: true, quiet: true }).info('hello');

		expect(spy).not.toHaveBeenCalled();
	});

	it('still surfaces warnings and errors', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});

		const log = createLogger(null, { quiet: true });
		log.warn('careful');
		log.error('boom');

		expect(warn).toHaveBeenCalled();
		expect(error).toHaveBeenCalled();
	});

	// quietMode is mutable: the CLI sets it through _setQuietModeOverride and a
	// consumer can call setQuietMode from their own config, both of which can
	// land after the logger is built.
	it('reads a function per call rather than capturing it', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		let quiet = false;
		const log = createLogger(null, { verbose: true, quiet: () => quiet });

		log.info('before');
		quiet = true;
		log.info('during');
		quiet = false;
		log.info('after');

		expect(spy.mock.calls.map((c) => c[1])).toEqual(['before', 'after']);
	});

	it('defaults to not quiet', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

		createLogger(null, { verbose: true }).info('hello');

		expect(spy).toHaveBeenCalled();
	});
});
