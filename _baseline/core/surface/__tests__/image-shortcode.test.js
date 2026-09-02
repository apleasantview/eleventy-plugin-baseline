import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const imageCalls = [];

// Capture what the shortcode asks eleventy-img for, without touching a file.
vi.mock('@11ty/eleventy-img', () => ({
	default: async (src, options) => {
		imageCalls.push({ src, options });
		return {
			webp: [
				{ url: '/media/x-320w.webp', srcset: '/media/x-320w.webp 320w', sourceType: 'image/webp', width: 320, height: 200 },
				{ url: '/media/x-960w.webp', srcset: '/media/x-960w.webp 960w', sourceType: 'image/webp', width: 960, height: 600 }
			]
		};
	}
}));

const { imageShortcode } = await import('../image-shortcode.js');

const context = {
	eleventy: { directories: { input: 'src', output: 'dist' } },
	ctx: { _baseline: { features: { hasImageTransformPlugin: false } } }
};

const render = (options) => imageShortcode.call(context, { src: '/img/x.jpg', alt: 'x', ...options });

describe('image shortcode — when generation is deferred', () => {
	let saved;

	beforeEach(() => {
		imageCalls.length = 0;
		saved = {
			runMode: process.env.ELEVENTY_RUN_MODE,
			prepass: process.env.BASELINE_PREPASS_ACTIVE
		};
		delete process.env.ELEVENTY_RUN_MODE;
		delete process.env.BASELINE_PREPASS_ACTIVE;
	});

	afterEach(() => {
		if (saved.runMode === undefined) delete process.env.ELEVENTY_RUN_MODE;
		else process.env.ELEVENTY_RUN_MODE = saved.runMode;
		if (saved.prepass === undefined) delete process.env.BASELINE_PREPASS_ACTIVE;
		else process.env.BASELINE_PREPASS_ACTIVE = saved.prepass;
	});

	// A build writes the renditions. This is the case that must not defer.
	it('generates in a build', async () => {
		process.env.ELEVENTY_RUN_MODE = 'build';
		await render();

		expect(imageCalls[0].options.transformOnRequest).toBe(false);
	});

	it('defers in serve mode, for a faster dev start', async () => {
		process.env.ELEVENTY_RUN_MODE = 'serve';
		await render();

		expect(imageCalls[0].options.transformOnRequest).toBe(true);
	});

	// The pre-pass renders every page into a dryRun that writes nothing, so
	// generating there means generating every rendition twice per build. The
	// graph reads the markup, which the metadata still carries.
	it('defers during the pre-pass, even though the run mode says build', async () => {
		process.env.ELEVENTY_RUN_MODE = 'build';
		process.env.BASELINE_PREPASS_ACTIVE = '1';
		await render();

		expect(imageCalls[0].options.transformOnRequest).toBe(true);
	});

	// The flag is cleared to '0' rather than deleted, so a truthiness test
	// would keep deferring for the rest of the build and write nothing.
	it('generates again once the pre-pass has cleared the flag', async () => {
		process.env.ELEVENTY_RUN_MODE = 'build';
		process.env.BASELINE_PREPASS_ACTIVE = '0';
		await render();

		expect(imageCalls[0].options.transformOnRequest).toBe(false);
	});

	it('still returns usable markup when it defers', async () => {
		process.env.BASELINE_PREPASS_ACTIVE = '1';
		const html = await render();

		expect(html).toContain('<picture>');
		expect(html).toContain('src="/media/x-320w.webp"');
	});
});
