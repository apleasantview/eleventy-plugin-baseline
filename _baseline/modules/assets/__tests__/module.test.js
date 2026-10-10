import { describe, expect, it } from 'vitest';
import { assetsCore } from '../index.js';

/**
 * Enough of an eleventyConfig to register against, recording the two things
 * worth asserting: what global data was declared, and what was hooked.
 */
function register(options = { assets: { esbuild: {} } }) {
	const globals = {};
	const events = {};

	const eleventyConfig = {
		globals,
		events,
		addGlobalData(key, value) {
			globals[key] = value;
		},
		on(name, handler) {
			events[name] = handler;
		},
		addAsyncFilter() {},
		addFilter() {},
		addTemplateFormats() {},
		addExtension() {},
		addWatchTarget() {},
		ignores: new Set()
	};

	assetsCore(eleventyConfig, {
		state: { settings: {}, options },
		directories: { input: './src/', assets: './src/assets/', output: './dist' },
		log: { status() {}, info() {}, warn() {}, error() {} }
	});

	return eleventyConfig;
}

describe('assetsCore registration', () => {
	// The sitemap module wrote its computed entry to a key its own template never
	// read, for six months. The wiring is the part worth an assertion.
	it('declares `_assets` as a function, so a rebuild re-resolves it', () => {
		const { globals } = register();

		expect(typeof globals._assets).toBe('function');
	});

	it('resolves `_assets` to an empty manifest before any build', () => {
		const { globals } = register();

		expect(globals._assets()).toEqual({});
	});

	it('builds the index on eleventy.before', () => {
		const { events } = register();

		expect(typeof events['eleventy.before']).toBe('function');
	});

	it('populates `_assets` once that handler has run', async () => {
		const { globals, events } = register();
		await events['eleventy.before']();

		// Keyed from this repo's own assets, which the handler scans for real.
		expect(Object.keys(globals._assets())).toContain('/assets/css/index.css');
	});

	// Eleventy runs `eleventy.before` handlers concurrently, so the root's own
	// handler has already set the active flag by the time this one runs. Reading
	// it here instead of at registration made the index never build at all.
	it('builds even while a sibling handler has the pre-pass flag set', async () => {
		const { globals, events } = register();

		process.env.BASELINE_PREPASS_ACTIVE = '1';
		try {
			await events['eleventy.before']();
		} finally {
			delete process.env.BASELINE_PREPASS_ACTIVE;
		}

		expect(Object.keys(globals._assets()).length).toBeGreaterThan(0);
	});

	// The other half: an instance that *is* the pre-pass has nothing to index,
	// because it is handed `ignore: [directories.assets]`.
	it('indexes nothing when this instance is the pre-pass', async () => {
		process.env.BASELINE_PREPASS_RUNNING = '1';
		let globals;
		let events;
		try {
			({ globals, events } = register());
		} finally {
			delete process.env.BASELINE_PREPASS_RUNNING;
		}

		await events['eleventy.before']();

		expect(globals._assets()).toEqual({});
	});

	// The option rides with its processor, so these are the two places it is read
	// from. Naming one leaves the other kind on the convention.
	it('reads entry points from `postcss` and `esbuild`', async () => {
		const { globals, events } = register({
			assets: {
				postcss: { entryPoints: ['index.css'] },
				esbuild: { entryPoints: ['vendor/index.js'] }
			}
		});
		await events['eleventy.before']();

		expect(Object.keys(globals._assets()).sort()).toEqual(['/assets/css/index.css', '/assets/js/vendor/index.js']);
	});

	it('leaves the kind with no list on the convention', async () => {
		const { globals, events } = register({
			assets: { postcss: { entryPoints: ['index.css'] } }
		});
		await events['eleventy.before']();

		expect(Object.keys(globals._assets())).toContain('/assets/js/index.js');
	});

	// Off until head can resolve a declared href, or a site's own `settings.head`
	// would point at a name the build no longer writes.
	it('does not fingerprint unless asked', async () => {
		const { globals, events } = register();
		await events['eleventy.before']();

		for (const [key, entry] of Object.entries(globals._assets())) {
			expect(entry.url).toBe(key);
		}
	});

	it('hands the index a permalink when fingerprinting is on', async () => {
		const runMode = process.env.ELEVENTY_RUN_MODE;
		process.env.ELEVENTY_RUN_MODE = 'build';
		let config;
		try {
			config = register({ assets: { esbuild: {}, fingerprint: true } });
			await config.events['eleventy.before']();
		} finally {
			process.env.ELEVENTY_RUN_MODE = runMode;
		}

		const entry = config.globals._assets()['/assets/css/index.css'];

		expect(entry.url).toBe(`/assets/css/index.${entry.hash}.css`);
	});

	it('leaves the compiled bytes out of what templates can read', async () => {
		const { globals, events } = register();
		await events['eleventy.before']();

		for (const entry of Object.values(globals._assets())) {
			expect(entry).not.toHaveProperty('content');
		}
	});
});
