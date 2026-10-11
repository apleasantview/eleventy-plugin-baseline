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

// Eleventy runs a computed function twice, once to discover what it reads and
// once for real, so a warning raised from one would otherwise double.
describe('warnOnce', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('says the same thing once however often it is asked', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const log = createLogger(null);

		log.warnOnce('bad date on page.md');
		log.warnOnce('bad date on page.md');
		log.warnOnce('bad date on page.md');

		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('is per message, not a blanket silence after the first', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const log = createLogger(null);

		log.warnOnce('bad date on one.md');
		log.warnOnce('bad date on two.md');
		log.warnOnce('bad date on one.md');

		expect(spy.mock.calls.map((c) => c[1])).toEqual(['bad date on one.md', 'bad date on two.md']);
	});

	it('does not silence plain warn', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const log = createLogger(null);

		log.warnOnce('repeated');
		log.warn('repeated');

		expect(spy).toHaveBeenCalledTimes(2);
	});
});

// The pre-pass gate had no tests, which is how the reference page came to claim
// the opposite of what the code does for a year. `info` and `warn` are both
// silenced while the inner Eleventy runs; only `error` is ungated, because a
// pre-pass that fails may be the only place it can say so.
describe('the pre-pass gate', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('silences info even when verbose is true', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

		createLogger(null, { verbose: true, prepass: true }).info('hello');

		expect(spy).not.toHaveBeenCalled();
	});

	it('silences warn, which the reference page used to deny', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		createLogger(null, { prepass: true }).warn('hello');

		expect(spy).not.toHaveBeenCalled();
	});

	it('lets error through', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

		createLogger(null, { prepass: true }).error('boom');

		expect(spy).toHaveBeenCalledWith('[baseline]', 'boom');
	});

	// The composition root passes a function closing over its config, which is
	// not resolved yet when the logger is built, so a captured boolean would
	// gate on whatever was true at construction.
	it('calls the predicate per call rather than capturing it', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		let inPrepass = false;
		const log = createLogger(null, { prepass: () => inPrepass });

		log.warn('before');
		inPrepass = true;
		log.warn('during');
		inPrepass = false;
		log.warn('after');

		expect(spy).toHaveBeenCalledTimes(2);
		expect(spy.mock.calls.map((c) => c[1])).toEqual(['before', 'after']);
	});

	// The reason `warnOnce` records after the gate rather than before it. A
	// pre-pass resolves the same pages, so recording first would bank every
	// message while silent and leave the real build with nothing to say.
	it('does not let a pre-pass spend a warnOnce the real build needs', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		let inPrepass = true;
		const log = createLogger(null, { prepass: () => inPrepass });

		log.warnOnce('bad date on page.md');
		inPrepass = false;
		log.warnOnce('bad date on page.md');

		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy.mock.calls[0][1]).toBe('bad date on page.md');
	});

	// No caller passes one during a real build, and the default decides whether
	// an omission means silence or speech.
	it('speaks when no predicate is passed', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		createLogger(null).warn('hello');

		expect(spy).toHaveBeenCalled();
	});

	// The env var it replaced is still published for consumers, and the logger
	// must not read it: two builds in one process set it for each other.
	it('ignores the published consumer signal', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		process.env.BASELINE_PREPASS_ACTIVE = '1';

		try {
			createLogger(null).warn('hello');
		} finally {
			delete process.env.BASELINE_PREPASS_ACTIVE;
		}

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

// The default tier: the handful of lines worth printing when the consumer has
// said nothing either way. The pre-pass bracket is the case that earns it,
// because it is the one part of a Baseline build with a wait attached.
describe('status', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('emits with verbose off, which is the whole point of it', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

		createLogger('pre-pass', { verbose: false }).status('starting');

		expect(spy).toHaveBeenCalledWith('[baseline/pre-pass]', 'starting');
	});

	it('is dropped by an explicit silence', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

		createLogger(null, { silent: true }).status('starting');

		expect(spy).not.toHaveBeenCalled();
	});

	it('is dropped by quiet mode', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

		createLogger(null, { quiet: true }).status('starting');

		expect(spy).not.toHaveBeenCalled();
	});

	it('is dropped inside the pre-pass, so the inner build does not echo it', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

		createLogger(null, { prepass: true }).status('starting');

		expect(spy).not.toHaveBeenCalled();
	});
});
