import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const imageCalls = [];
const state = { metadata: null };

// Two renditions per format, smallest first, the way eleventy-img orders them.
function renditions(format) {
	return [320, 960].map((width) => ({
		url: `/media/x-${width}w.${format}`,
		srcset: `/media/x-${width}w.${format} ${width}w`,
		sourceType: `image/${format}`,
		width,
		height: Math.round(width * 0.625)
	}));
}

// Capture what the shortcode asks eleventy-img for, without touching a file.
vi.mock('@11ty/eleventy-img', () => ({
	default: async (src, options) => {
		imageCalls.push({ src, options });
		return state.metadata ?? { webp: renditions('webp') };
	}
}));

const { createImageShortcode } = await import('../image-shortcode.js');
const { deriveBaselineState } = await import('../../state.js');

// The real resolved defaults, so these tests break if the wiring between
// `options.media.image` and the shortcode ever comes apart.
const DEFAULTS = deriveBaselineState({}, {}).options.media.image;
const DEFAULT_WIDTHS = DEFAULTS.widths;
const DEFAULT_SIZES = DEFAULTS.sizes;

const log = { status() {}, info() {}, warn() {}, error() {} };

const context = { eleventy: { directories: { input: 'src', output: 'dist' } } };

// A fresh factory per call, so nothing a factory holds carries between tests.
const render = (options, factoryContext) =>
	createImageShortcode({ log, defaults: DEFAULTS, ...factoryContext }).call(context, {
		src: '/img/x.jpg',
		alt: 'x',
		...options
	});

describe('image shortcode — when generation is deferred', () => {
	let saved;

	beforeEach(() => {
		imageCalls.length = 0;
		state.metadata = null;
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

	// A build writes the renditions. This is the case that must skip neither.
	it('generates in a build', async () => {
		process.env.ELEVENTY_RUN_MODE = 'build';
		await render();

		expect(imageCalls[0].options.transformOnRequest).toBe(false);
		expect(imageCalls[0].options.statsOnly).toBe(false);
	});

	// Serve wants the dev middleware, which is what transformOnRequest installs
	// along with its own URL format.
	it('defers to the middleware in serve mode', async () => {
		process.env.ELEVENTY_RUN_MODE = 'serve';
		await render();

		expect(imageCalls[0].options.transformOnRequest).toBe(true);
		expect(imageCalls[0].options.statsOnly).toBe(false);
	});

	// The pre-pass renders every page into a dryRun that writes nothing, so
	// encoding there means encoding every rendition twice per build. It takes
	// `statsOnly` rather than `transformOnRequest` because that skips the same
	// work while keeping the hashed URL the built site will actually carry.
	it('takes stats only during the pre-pass, not the middleware URL', async () => {
		process.env.ELEVENTY_RUN_MODE = 'build';
		process.env.BASELINE_PREPASS_ACTIVE = '1';
		await render();

		expect(imageCalls[0].options.statsOnly).toBe(true);
		expect(imageCalls[0].options.transformOnRequest).toBe(false);
	});

	// The flag is cleared to '0' rather than deleted, so a truthiness test
	// would keep skipping for the rest of the build and write nothing.
	it('generates again once the pre-pass has cleared the flag', async () => {
		process.env.ELEVENTY_RUN_MODE = 'build';
		process.env.BASELINE_PREPASS_ACTIVE = '0';
		await render();

		expect(imageCalls[0].options.statsOnly).toBe(false);
	});

	it('still returns usable markup when it skips the encode', async () => {
		process.env.BASELINE_PREPASS_ACTIVE = '1';
		const html = await render();

		expect(html).toContain('<picture>');
		expect(html).toContain('src="/media/x-320w.webp"');
	});
});

describe('image shortcode — where renditions are written', () => {
	let saved;

	beforeEach(() => {
		imageCalls.length = 0;
		state.metadata = null;
		saved = process.env.ELEVENTY_RUN_MODE;
		delete process.env.ELEVENTY_RUN_MODE;
	});

	afterEach(() => {
		if (saved === undefined) delete process.env.ELEVENTY_RUN_MODE;
		else process.env.ELEVENTY_RUN_MODE = saved;
	});

	it('writes into the output directory when no cache is configured', async () => {
		process.env.ELEVENTY_RUN_MODE = 'build';
		await render();

		expect(imageCalls[0].options.outputDir).toBe(path.join('.', 'dist', 'media'));
	});

	// The cache only earns its keep in a build, which is the mode that writes
	// bytes and the mode the composition root copies them out of afterwards.
	it('writes into the cache in a build', async () => {
		process.env.ELEVENTY_RUN_MODE = 'build';
		await render({}, { cacheDir: '.cache/media' });

		expect(imageCalls[0].options.outputDir).toBe('.cache/media');
	});

	// Serve serves from the output directory, so a rendition written to the
	// cache would 404 rather than appear.
	it('ignores the cache in serve mode', async () => {
		process.env.ELEVENTY_RUN_MODE = 'serve';
		await render({}, { cacheDir: '.cache/media' });

		expect(imageCalls[0].options.outputDir).toBe(path.join('.', 'dist', 'media'));
	});

	// Somebody who named a directory wants the files in it.
	it('leaves an authored outputDir alone', async () => {
		process.env.ELEVENTY_RUN_MODE = 'build';
		await render({ outputDir: 'dist/pictures' }, { cacheDir: '.cache/media' });

		expect(imageCalls[0].options.outputDir).toBe('dist/pictures');
	});

	// The URL is independent of where the bytes land, which is what makes the
	// redirect invisible to the markup.
	it('keeps the public URL path when the cache is in use', async () => {
		process.env.ELEVENTY_RUN_MODE = 'build';
		const html = await render({}, { cacheDir: '.cache/media' });

		expect(imageCalls[0].options.urlPath).toBe('/media/');
		expect(html).toContain('src="/media/x-320w.webp"');
	});
});

// The `<img>` inside `<picture>` is the last resort for a client that can use
// no `<source>` at all, so it must be the most compatible rendition available.
// Before 2026-09-02 it was whichever format the author listed first, which with
// the default `['avif', 'webp']` meant the least compatible one.
describe('image shortcode — the <picture> fallback', () => {
	beforeEach(() => {
		state.metadata = null;
		imageCalls.length = 0;
	});

	it('takes jpeg over webp and avif, whatever order they arrive in', async () => {
		state.metadata = { avif: renditions('avif'), webp: renditions('webp'), jpeg: renditions('jpeg') };
		const html = await render();

		expect(html).toContain('<img src="/media/x-320w.jpeg"');
	});

	it('takes webp over avif when there is no jpeg', async () => {
		state.metadata = { avif: renditions('avif'), webp: renditions('webp') };
		const html = await render();

		expect(html).toContain('<img src="/media/x-320w.webp"');
	});

	// Every format still gets its own <source>, in the order the author asked
	// for, because that is what negotiation reads.
	it('leaves the <source> order alone', async () => {
		state.metadata = { avif: renditions('avif'), webp: renditions('webp'), jpeg: renditions('jpeg') };
		const html = await render();
		const types = [...html.matchAll(/<source type="image\/(\w+)"/g)].map((m) => m[1]);

		expect(types).toEqual(['avif', 'webp', 'jpeg']);
	});

	// A format outside the preference list is still the only thing on offer.
	it('falls back to the first format when none is recognised', async () => {
		state.metadata = { jxl: renditions('jxl') };
		const html = await render();

		expect(html).toContain('<img src="/media/x-320w.jxl"');
	});

	// Dimensions come from the largest rendition of the chosen format, so a
	// changed fallback format must not change the intrinsic size.
	it('sizes the fallback from its own largest rendition', async () => {
		state.metadata = { avif: renditions('avif'), jpeg: renditions('jpeg') };
		const html = await render();

		expect(html).toContain('width="960"');
		expect(html).toContain('height="600"');
	});
});

// Published so a project can read what the shortcode assumes instead of
// copying the values, or the whole shortcode, as one consumer already has.
describe('image shortcode — where the defaults come from', () => {
	beforeEach(() => {
		state.metadata = null;
		imageCalls.length = 0;
	});

	it('takes them from resolved state, not from the module', async () => {
		await render({}, { defaults: { widths: [100], formats: ['webp'], sizes: '50vw' } });

		expect(imageCalls[0].options.widths).toEqual([100]);
		expect(imageCalls[0].options.formats).toEqual(['webp']);
	});

	// The project's house style, set once at registration.
	it('lets options.media.image replace them', () => {
		const state = deriveBaselineState({}, { media: { image: { widths: [640], formats: ['webp'] } } });

		expect(state.options.media.image.widths).toEqual([640]);
		expect(state.options.media.image.formats).toEqual(['webp']);
		// Untouched keys keep the fallback.
		expect(state.options.media.image.sizes).toBe(DEFAULT_SIZES);
	});

	// Most specific wins: a single call still beats the project's setting.
	it('lets a call override the project setting', async () => {
		const state = deriveBaselineState({}, { media: { image: { widths: [640] } } });
		await render({ widths: [200] }, { defaults: state.options.media.image });

		expect(imageCalls[0].options.widths).toEqual([200]);
	});
});

// A fixed `sizes` string asserts a layout the shortcode cannot see, and ours
// was WordPress's content width. `auto` uses the width the image is actually
// laid out at; the rest of the list is what browsers without it read.
describe('image shortcode — sizes', () => {
	beforeEach(() => {
		state.metadata = null;
		imageCalls.length = 0;
	});

	const sizesOf = (html) => html.match(/sizes="([^"]*)"/)?.[1];

	it('asks for auto sizing on a lazy image, keeping the old string behind it', async () => {
		const html = await render();

		expect(sizesOf(html)).toBe(`auto, ${DEFAULT_SIZES}`);
	});

	// `auto` is only valid when a lazy <img> follows the <source>.
	it('leaves auto off an eager image', async () => {
		const html = await render({ loading: 'eager' });

		expect(sizesOf(html)).toBe(DEFAULT_SIZES);
	});

	// The guess is ours to improve. An answer the caller gave is not.
	it('passes an explicit sizes through untouched', async () => {
		const html = await render({ sizes: '(min-width: 60em) 40vw, 100vw' });

		expect(sizesOf(html)).toBe('(min-width: 60em) 40vw, 100vw');
	});
});

// `'auto'` as a width re-encodes the full-size original, which is the most
// expensive rendition in the set and rarely the one wanted.
describe('image shortcode — default widths', () => {
	beforeEach(() => {
		imageCalls.length = 0;
	});

	it('does not ask for the full-size original by default', () => {
		expect(DEFAULT_WIDTHS).not.toContain('auto');
		expect(DEFAULT_WIDTHS.every((width) => typeof width === 'number')).toBe(true);
	});

	it('still passes it through when a caller asks', async () => {
		await render({ widths: [...DEFAULT_WIDTHS, 'auto'] });

		expect(imageCalls[0].options.widths).toContain('auto');
	});
});

// One rule: an attribute bag per element, named for the element it lands on.
// Before this, a class on the image had two routes that merged and a style had
// two routes where one silently won.
describe('image shortcode — attributes', () => {
	beforeEach(() => {
		state.metadata = null;
		imageCalls.length = 0;
	});

	const pictureTag = (html) => html.match(/<picture[^>]*>/)[0];
	const imgTag = (html) => html.match(/<img[^>]*>/)[0];

	it('puts the img bag on the img and the picture bag on the picture', async () => {
		const html = await render({
			img: { class: 'u-rounded', 'data-zoom': true },
			picture: { class: 'c-hero__media', slot: 'image' }
		});

		expect(imgTag(html)).toContain('class="u-rounded"');
		expect(imgTag(html)).toContain('data-zoom');
		expect(pictureTag(html)).toContain('class="c-hero__media"');
		expect(pictureTag(html)).toContain('slot="image"');
	});

	// The excellent run needed exactly this and could not have it: a WebC
	// component with named slots wants `slot` on the outer element.
	it('takes any attribute on the container, not only a class', async () => {
		const html = await render({ picture: { id: 'hero', 'aria-hidden': 'true' } });

		expect(pictureTag(html)).toContain('id="hero"');
		expect(pictureTag(html)).toContain('aria-hidden="true"');
	});

	it('leaves the picture tag bare when nothing is passed', async () => {
		expect(pictureTag(await render())).toBe('<picture>');
	});

	// What the caller wrote beats what the shortcode assumed.
	it('lets the bag override a derived attribute', async () => {
		const html = await render({ img: { loading: 'eager', width: 100 } });

		expect(imgTag(html)).toContain('loading="eager"');
		expect(imgTag(html)).toContain('width="100"');
	});

	it('drops attributes with nothing to say', async () => {
		const html = await render({ img: { title: '', hidden: false, lang: null } });

		expect(imgTag(html)).not.toContain('title');
		expect(imgTag(html)).not.toContain('hidden');
		expect(imgTag(html)).not.toContain('lang');
	});
});

// A caption is the only control. There is no switch that sets one and then
// loses it, which is what `figure: false` plus a caption used to do.
describe('image shortcode — the figure wrapper', () => {
	beforeEach(() => {
		state.metadata = null;
	});

	it('wraps when there is a caption', async () => {
		const html = await render({ caption: 'A view' });

		expect(html).toContain('<figure>');
		expect(html).toContain('<figcaption>A view</figcaption>');
	});

	it('does not wrap when there is none', async () => {
		expect(await render()).not.toContain('<figure>');
	});

	it('ignores an option it no longer has', async () => {
		const html = await render({ caption: 'A view', figure: false });

		expect(html).toContain('<figcaption>A view</figcaption>');
	});
});

// eleventy-img throws on a missing alt and so do we now: a warning is something
// you have to notice, and the image ships either way.
describe('image shortcode — alt', () => {
	it('throws when alt is missing', async () => {
		await expect(render({ alt: undefined })).rejects.toThrow(/alt is required/);
	});

	it('accepts an empty string for a decorative image', async () => {
		const html = await render({ alt: '' });

		expect(html).toContain('alt=""');
	});
});
