import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
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

// Real esbuild, a real entry file. The point of these is that the options bag
// is a pass-through, which is what the docs have always claimed and what the
// processor did not do until it read only `minify` and `target`.
describe('esbuild options pass through', () => {
	let directory;
	let entry;

	beforeAll(() => {
		directory = fs.mkdtempSync(path.join(os.tmpdir(), 'baseline-esbuild-'));
		entry = path.join(directory, 'index.js');
		fs.writeFileSync(entry, 'const greeting = "hi";\nconsole.log(greeting, WHO);\n');
	});

	afterAll(() => {
		fs.rmSync(directory, { recursive: true, force: true });
	});

	it('still applies its own defaults', async () => {
		const js = await assetsESbuild(entry, { define: { WHO: '"world"' } });

		// minify: true, so the local name is gone and there is no indentation.
		expect(js).not.toContain('greeting');
		expect(js).toContain('world');
	});

	it('takes an option it never read before', async () => {
		const js = await assetsESbuild(entry, {
			define: { WHO: '"world"' },
			banner: { js: '/* baseline */' }
		});

		expect(js.startsWith('/* baseline */')).toBe(true);
	});

	it('lets a default be overridden', async () => {
		const js = await assetsESbuild(entry, { define: { WHO: '"world"' }, minify: false });

		expect(js).toContain('greeting');
	});

	// Two keys are not the caller's to set. `entryPoints` is the argument, and
	// `write` would send the bytes to disk and leave this function returning
	// nothing readable.
	it('keeps entryPoints and write to itself', async () => {
		const decoy = path.join(directory, 'decoy.js');
		fs.writeFileSync(decoy, 'console.log("decoy");\n');

		const js = await assetsESbuild(entry, {
			define: { WHO: '"world"' },
			entryPoints: [decoy],
			write: true,
			outfile: path.join(directory, 'out.js')
		});

		expect(js).toContain('world');
		expect(js).not.toContain('decoy');
		expect(fs.existsSync(path.join(directory, 'out.js'))).toBe(false);
	});
});
