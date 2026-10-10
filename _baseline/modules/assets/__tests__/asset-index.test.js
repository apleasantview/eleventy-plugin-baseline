import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAssetIndex } from '../asset-index.js';

describe('createAssetIndex', () => {
	let root;
	let deps;
	let cssCalls;
	let jsCalls;

	// Stands in for PostCSS and esbuild. Returns the entry's own bytes plus its
	// imported partial's, which is what makes the partial-change case below a
	// real test rather than a restatement of the stub.
	function stubProcessors() {
		cssCalls = [];
		jsCalls = [];
		return {
			css: (inputPath) => {
				cssCalls.push(inputPath);
				return fs.readFileSync(inputPath, 'utf8') + fs.readFileSync(path.join(root, 'css/_partial.css'), 'utf8');
			},
			js: (inputPath) => {
				jsCalls.push(inputPath);
				return fs.readFileSync(inputPath, 'utf8');
			}
		};
	}

	beforeAll(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), 'baseline-index-'));

		const write = (relative, content) => {
			const file = path.join(root, relative);
			fs.mkdirSync(path.dirname(file), { recursive: true });
			fs.writeFileSync(file, content);
		};

		write('css/index.css', '.entry{color:black}');
		write('css/_partial.css', '.partial{color:rebeccapurple}');
		write('js/index.js', 'export const a = 1;');
		write('js/vendor/index.js', 'export const b = 2;');

		const posix = root.split(path.sep).join('/');
		deps = {
			inputDirectory: posix,
			cssDirectory: `${posix}/css/`,
			jsDirectory: `${posix}/js/`
		};
	});

	afterAll(() => {
		fs.rmSync(root, { recursive: true, force: true });
	});

	it('keys every entry by the path an author writes', async () => {
		const index = createAssetIndex({ ...deps, processors: stubProcessors() });
		await index.build();

		expect(Object.keys(index.all()).sort()).toEqual(['/css/index.css', '/js/index.js', '/js/vendor/index.js']);
	});

	it('compiles each entry exactly once', async () => {
		const index = createAssetIndex({ ...deps, processors: stubProcessors() });
		await index.build();

		expect(cssCalls).toHaveLength(1);
		expect(jsCalls).toHaveLength(2);
	});

	it('carries a hash, an integrity value and a size', async () => {
		const index = createAssetIndex({ ...deps, processors: stubProcessors() });
		await index.build();
		const entry = index.get('/css/index.css');

		expect(entry.hash).toMatch(/^[0-9a-f]{8}$/);
		expect(entry.integrity).toMatch(/^sha384-[A-Za-z0-9+/]+=*$/);
		expect(entry.size).toBe(Buffer.byteLength(entry.content));
	});

	// The url stays the authored path until fingerprinting changes it, which is
	// what makes every consumer's lookup a no-op in the meantime.
	it('leaves url equal to the key', async () => {
		const index = createAssetIndex({ ...deps, processors: stubProcessors() });
		await index.build();

		expect(index.get('/js/index.js').url).toBe('/js/index.js');
	});

	it('gives the same hash for the same bytes across two builds', async () => {
		const index = createAssetIndex({ ...deps, processors: stubProcessors() });
		await index.build();
		const first = index.get('/css/index.css').hash;
		await index.build();

		expect(index.get('/css/index.css').hash).toBe(first);
	});

	// The whole point. A cache keyed on the entry file's mtime would miss this,
	// because the entry file is untouched.
	it('changes the hash when an imported partial changes and the entry does not', async () => {
		const index = createAssetIndex({ ...deps, processors: stubProcessors() });
		await index.build();
		const before = index.get('/css/index.css').hash;
		const entryBytes = fs.readFileSync(path.join(root, 'css/index.css'), 'utf8');

		fs.writeFileSync(path.join(root, 'css/_partial.css'), '.partial{color:hotpink}');
		await index.build();

		expect(fs.readFileSync(path.join(root, 'css/index.css'), 'utf8')).toBe(entryBytes);
		expect(index.get('/css/index.css').hash).not.toBe(before);
	});

	it('drops an entry that has gone away', async () => {
		const index = createAssetIndex({ ...deps, processors: stubProcessors() });
		await index.build();
		fs.rmSync(path.join(root, 'js/vendor'), { recursive: true, force: true });
		await index.build();

		expect(index.get('/js/vendor/index.js')).toBeUndefined();
		expect(index.get('/js/index.js')).toBeDefined();
	});

	// What dev gets: the lookup resolves, nothing compiles, and anything reading
	// a hash has to guard because there is genuinely nothing to give it.
	it('keys the index without compiling when asked not to', async () => {
		const index = createAssetIndex({ ...deps, processors: stubProcessors() });
		await index.build({ compile: false });

		expect(Object.keys(index.all())).toContain('/css/index.css');
		expect(cssCalls).toEqual([]);
		expect(index.get('/css/index.css').url).toBe('/css/index.css');
		expect(index.get('/css/index.css').hash).toBeUndefined();
	});

	describe('manifest', () => {
		// `content` is what the compile guards read. In the cascade it would carry
		// every asset's bytes into every page's data and the navigator's dump.
		it('leaves the compiled bytes out', async () => {
			const index = createAssetIndex({ ...deps, processors: stubProcessors() });
			await index.build();
			const entry = index.manifest()['/css/index.css'];

			expect(Object.keys(entry).sort()).toEqual(['hash', 'integrity', 'size', 'url']);
			expect(index.get('/css/index.css').content).toBeDefined();
		});

		it('keys it the same way the index is keyed', async () => {
			const index = createAssetIndex({ ...deps, processors: stubProcessors() });
			await index.build();

			expect(Object.keys(index.manifest())).toEqual(Object.keys(index.all()));
		});

		it('is empty before the first build', async () => {
			const index = createAssetIndex({ ...deps, processors: stubProcessors() });

			expect(index.manifest()).toEqual({});
		});
	});

	it('is empty before the first build', () => {
		const index = createAssetIndex({ ...deps, processors: stubProcessors() });

		expect(index.all()).toEqual({});
		expect(index.get('/css/index.css')).toBeUndefined();
	});
});
