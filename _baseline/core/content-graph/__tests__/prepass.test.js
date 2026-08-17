import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const constructorCalls = [];

// Capture what the pre-pass hands the nested instance without booting Eleventy.
vi.mock('@11ty/eleventy', () => ({
	default: class {
		constructor(input, output, options) {
			constructorCalls.push({ input, output, options });
		}
		async toJSON() {
			return [];
		}
	}
}));

vi.mock('node:fs/promises', () => ({
	mkdir: vi.fn(async () => undefined),
	readFile: vi.fn(async () => '{}'),
	writeFile: vi.fn(async () => undefined)
}));

const { runPrepass } = await import('../prepass.js');

const silentLog = () => ({ info: () => {}, warn: () => {}, error: () => {} });

describe('runPrepass — nested instance environment', () => {
	let saved;

	beforeEach(() => {
		constructorCalls.length = 0;
		saved = {
			runMode: process.env.ELEVENTY_RUN_MODE,
			source: process.env.ELEVENTY_SOURCE
		};
	});

	afterEach(() => {
		process.env.ELEVENTY_RUN_MODE = saved.runMode;
		process.env.ELEVENTY_SOURCE = saved.source;
	});

	// A nested Eleventy writes ELEVENTY_RUN_MODE and ELEVENTY_SOURCE to
	// process.env for the whole process. Left to default it rewrites a `serve`
	// run as `build`, which silently disabled drafts-in-dev and the image
	// shortcode's transform-on-request between 2026-05-07 and 2026-08-18.
	it('passes the outer run mode and source through, rather than defaulting', async () => {
		process.env.ELEVENTY_RUN_MODE = 'serve';
		process.env.ELEVENTY_SOURCE = 'cli';

		await runPrepass('src', 'dist', silentLog);

		expect(constructorCalls).toHaveLength(1);
		expect(constructorCalls[0].options.runMode).toBe('serve');
		expect(constructorCalls[0].options.source).toBe('cli');
	});

	it('still runs dry, so the pre-pass never writes site output', async () => {
		await runPrepass('src', 'dist', silentLog);

		expect(constructorCalls[0].options.dryRun).toBe(true);
	});
});
