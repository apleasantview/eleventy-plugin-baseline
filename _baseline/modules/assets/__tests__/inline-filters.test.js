import { beforeEach, describe, expect, it, vi } from 'vitest';

const esbuildCalls = [];

// The processors are exercised in processors.test.js. Here they only need to
// return something recognisable, so the assertions are about the tag.
vi.mock('../processors/esbuild-process.js', () => ({
	default: async (inputPath, options) => {
		esbuildCalls.push({ inputPath, options });
		return 'JS';
	}
}));

vi.mock('../processors/postcss-process.js', () => ({
	default: async () => 'CSS'
}));

const { assetsCore } = await import('../index.js');

const log = { status() {}, info() {}, warn() {}, error() {} };

// Enough of an eleventyConfig for the module to register against, keeping the
// filters it defines.
function register() {
	const filters = {};
	const eleventyConfig = {
		addAsyncFilter: (name, fn) => {
			filters[name] = fn;
		},
		addTemplateFormats() {},
		addExtension() {},
		addWatchTarget() {},
		ignores: new Set(),
		on() {}
	};

	assetsCore(eleventyConfig, {
		state: { settings: {}, options: { assets: { esbuild: {} } } },
		directories: { input: 'src/', assets: 'src/assets/', output: 'dist' },
		log
	});

	return filters;
}

describe('inlineESbuild', () => {
	beforeEach(() => {
		esbuildCalls.length = 0;
	});

	it('wraps the bundle in a bare script tag when nothing is asked for', async () => {
		const filters = register();

		expect(await filters.inlineESbuild('a.js')).toBe('<script>JS</script>');
	});

	// The point of the option: a nonce cannot be added after the fact without
	// unwrapping the tag, and unwrapping minified JS with a tag sanitiser eats
	// it, because minified JS is dense with `<` followed by a letter.
	it('puts attributes on the tag', async () => {
		const filters = register();
		const html = await filters.inlineESbuild('a.js', {
			attributes: { type: 'module', defer: true, nonce: 'r4nd0m' }
		});

		expect(html).toBe('<script type="module" defer nonce="r4nd0m">JS</script>');
	});

	// `attributes` is Baseline's key, not esbuild's, so it must not travel on to
	// the processor as though it were one of its options.
	it('keeps attributes out of the processor options', async () => {
		const filters = register();
		await filters.inlineESbuild('a.js', { minify: false, attributes: { defer: true } });

		expect(esbuildCalls[0].options).toEqual({ minify: false });
	});

	it('still forwards the processor options it always did', async () => {
		const filters = register();
		await filters.inlineESbuild('a.js', { minify: false, target: 'es2018' });

		expect(esbuildCalls[0].options).toEqual({ minify: false, target: 'es2018' });
	});
});

describe('inlinePostCSS', () => {
	it('wraps the stylesheet in a bare style tag when nothing is asked for', async () => {
		const filters = register();

		expect(await filters.inlinePostCSS('a.css')).toBe('<style>CSS</style>');
	});

	it('puts attributes on the tag', async () => {
		const filters = register();
		const html = await filters.inlinePostCSS('a.css', { attributes: { media: 'print' } });

		expect(html).toBe('<style media="print">CSS</style>');
	});
});
