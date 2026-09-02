import { afterEach, describe, expect, it, vi } from 'vitest';
import assetsESbuild from '../processors/esbuild-process.js';
import assetsPostCSS from '../processors/postcss-process.js';

// A path that cannot be read is the cheapest way into the failure branch, and
// it is also a real case: an entry point named in `settings.head` that nothing
// emits, or a file moved without updating the reference.
const MISSING = 'this-file-does-not-exist-anywhere.css';
const MISSING_JS = 'this-file-does-not-exist-anywhere.js';

function withRunMode(mode, fn) {
	const previous = process.env.ELEVENTY_RUN_MODE;
	if (mode === undefined) delete process.env.ELEVENTY_RUN_MODE;
	else process.env.ELEVENTY_RUN_MODE = mode;

	return Promise.resolve(fn()).finally(() => {
		if (previous === undefined) delete process.env.ELEVENTY_RUN_MODE;
		else process.env.ELEVENTY_RUN_MODE = previous;
	});
}

describe('asset processors on failure', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	// The whole point of the change. A green build that ships a page with no
	// stylesheet is worse than a red one, and there is no useful site on the
	// other side of a stylesheet that did not compile.
	it('throws in a build, naming the file', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});

		await withRunMode('build', async () => {
			await expect(assetsPostCSS(MISSING)).rejects.toThrow(/PostCSS failed for .*this-file-does-not-exist/);
			await expect(assetsESbuild(MISSING_JS)).rejects.toThrow(/esbuild failed for .*this-file-does-not-exist/);
		});
	});

	it('keeps the original error as the cause', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});

		await withRunMode('build', async () => {
			const error = await assetsPostCSS(MISSING).catch((e) => e);
			expect(error.cause).toBeDefined();
		});
	});

	// The dev server is the exception: a dead watch loop is worse than an
	// unstyled reload, so serve mode degrades and says so loudly instead.
	it('degrades in serve mode, and logs the cause', async () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await withRunMode('serve', async () => {
			await expect(assetsPostCSS(MISSING)).resolves.toBe('/* Error processing CSS */');
			await expect(assetsESbuild(MISSING_JS)).resolves.toBe('/* Error processing JS */');
		});

		expect(spy).toHaveBeenCalled();
	});

	// Anything that is not a build gets the forgiving branch, including a bare
	// programmatic run with no run mode set at all.
	it('degrades when no run mode is set', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});

		await withRunMode(undefined, async () => {
			await expect(assetsPostCSS(MISSING)).resolves.toBe('/* Error processing CSS */');
		});
	});
});
