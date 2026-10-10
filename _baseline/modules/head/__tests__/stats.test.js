import { describe, expect, it } from 'vitest';
import { headCore } from '../index.js';

/**
 * Enough of an eleventyConfig to register head against, holding the posthtml
 * plugin so pages can be pushed through it, and the `eleventy.after` handler
 * that reports the count.
 */
function register() {
	const events = {};
	const lines = [];
	let plugin;

	const eleventyConfig = {
		on(name, handler) {
			events[name] = handler;
		},
		htmlTransformer: {
			addPosthtmlPlugin(_format, fn) {
				plugin = fn;
			}
		}
	};

	headCore(eleventyConfig, {
		state: { settings: {}, options: {} },
		runtime: {},
		log: {
			status() {},
			info: (line) => lines.push(line),
			warn() {},
			error() {}
		},
		resolvePageContext: null,
		resolveSeoGraph: null
	});

	return {
		// The transform's context shape: the page, and `outputPath` beside it
		// rather than on it, which is where the module reads it from.
		visit: ({ outputPath, ...page }) => plugin({ page, outputPath }),
		finish: () => events['eleventy.after'](),
		counted: () => lines.map((line) => /into (\d+) pages/.exec(line)?.[1]).filter(Boolean).at(-1)
	};
}

// `[baseline/head] Head injected into 26 pages` on a build that wrote 34, on a
// consumer's site. All 34 were correct; the eight missing were one paginated
// template's tag pages, counted once because the Set was keyed on the input.
describe('the pages head reports', () => {
	it('counts a paginated template once per output page', () => {
		const head = register();

		for (const n of [1, 2, 3]) {
			head.visit({ inputPath: './src/tags.njk', url: `/tags/${n}/`, outputPath: `./dist/tags/${n}/index.html` });
		}
		head.finish();

		expect(head.counted()).toBe('3');
	});

	it('still counts an ordinary page once', () => {
		const head = register();

		head.visit({ inputPath: './src/about.md', url: '/about/', outputPath: './dist/about/index.html' });
		head.visit({ inputPath: './src/about.md', url: '/about/', outputPath: './dist/about/index.html' });
		head.finish();

		expect(head.counted()).toBe('1');
	});

	// A virtual template can reach the transform with no url, and counting it as
	// nothing would be worse than counting it by where it was written.
	it('falls back to the output path when there is no url', () => {
		const head = register();

		head.visit({ inputPath: './src/a.njk', outputPath: './dist/a/index.html' });
		head.visit({ inputPath: './src/a.njk', outputPath: './dist/b/index.html' });
		head.finish();

		expect(head.counted()).toBe('2');
	});

	// Watch mode reruns the same build, and a count that accumulates across
	// cycles reads as the site growing.
	it('starts from nothing on the next build', () => {
		const head = register();

		head.visit({ inputPath: './src/a.njk', url: '/a/' });
		head.finish();
		head.visit({ inputPath: './src/b.njk', url: '/b/' });
		head.finish();

		expect(head.counted()).toBe('1');
	});
});
