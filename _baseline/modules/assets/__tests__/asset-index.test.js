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

	// Stands in for PostCSS and esbuild. The css one returns the entry's own bytes
	// plus its imported partial's, which is what makes the partial-change case
	// below a real test rather than a restatement of the stub.
	function sources({ css: cssEntryPoints, js: jsEntryPoints } = {}) {
		cssCalls = [];
		jsCalls = [];
		return [
			{
				directory: `${deps.root}/css/`,
				basename: 'index.css',
				entryPoints: cssEntryPoints,
				compile: (inputPath) => {
					cssCalls.push(inputPath);
					return fs.readFileSync(inputPath, 'utf8') + fs.readFileSync(path.join(root, 'css/_partial.css'), 'utf8');
				}
			},
			{
				directory: `${deps.root}/js/`,
				basename: 'index.js',
				entryPoints: jsEntryPoints,
				compile: (inputPath) => {
					jsCalls.push(inputPath);
					return fs.readFileSync(inputPath, 'utf8');
				}
			}
		];
	}

	/** The index under test, with the fixture's two sources. */
	function makeIndex(entryPoints) {
		return createAssetIndex({ inputDirectory: deps.root, sources: sources(entryPoints) });
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
		deps = { root: posix, cssDirectory: `${posix}/css/` };
	});

	afterAll(() => {
		fs.rmSync(root, { recursive: true, force: true });
	});

	it('keys every entry by the path an author writes', async () => {
		const index = makeIndex();
		await index.build();

		expect(Object.keys(index.all()).sort()).toEqual(['/css/index.css', '/js/index.js', '/js/vendor/index.js']);
	});

	it('compiles each entry exactly once', async () => {
		const index = makeIndex();
		await index.build();

		expect(cssCalls).toHaveLength(1);
		expect(jsCalls).toHaveLength(2);
	});

	it('carries a hash, an integrity value and a size', async () => {
		const index = makeIndex();
		await index.build();
		const entry = index.get('/css/index.css');

		expect(entry.hash).toMatch(/^[0-9a-f]{8}$/);
		expect(entry.integrity).toMatch(/^sha384-[A-Za-z0-9+/]+=*$/);
		expect(entry.size).toBe(Buffer.byteLength(entry.content));
	});

	// The url stays the authored path until fingerprinting changes it, which is
	// what makes every consumer's lookup a no-op in the meantime.
	it('leaves url equal to the key', async () => {
		const index = makeIndex();
		await index.build();

		expect(index.get('/js/index.js').url).toBe('/js/index.js');
	});

	it('gives the same hash for the same bytes across two builds', async () => {
		const index = makeIndex();
		await index.build();
		const first = index.get('/css/index.css').hash;
		await index.build();

		expect(index.get('/css/index.css').hash).toBe(first);
	});

	// The whole point. A cache keyed on the entry file's mtime would miss this,
	// because the entry file is untouched.
	it('changes the hash when an imported partial changes and the entry does not', async () => {
		const index = makeIndex();
		await index.build();
		const before = index.get('/css/index.css').hash;
		const entryBytes = fs.readFileSync(path.join(root, 'css/index.css'), 'utf8');

		fs.writeFileSync(path.join(root, 'css/_partial.css'), '.partial{color:hotpink}');
		await index.build();

		expect(fs.readFileSync(path.join(root, 'css/index.css'), 'utf8')).toBe(entryBytes);
		expect(index.get('/css/index.css').hash).not.toBe(before);
	});

	// On its own file rather than a shared one: the fixture is built once for the
	// whole describe, so a test that deletes part of it breaks its siblings.
	it('drops an entry that has gone away', async () => {
		fs.mkdirSync(path.join(root, 'js/transient'), { recursive: true });
		fs.writeFileSync(path.join(root, 'js/transient/index.js'), 'export const t = 1;');

		const index = makeIndex();
		await index.build();
		expect(index.get('/js/transient/index.js')).toBeDefined();

		fs.rmSync(path.join(root, 'js/transient'), { recursive: true, force: true });
		await index.build();

		expect(index.get('/js/transient/index.js')).toBeUndefined();
		expect(index.get('/js/index.js')).toBeDefined();
	});

	// What dev gets: the lookup resolves, nothing compiles, and anything reading
	// a hash has to guard because there is genuinely nothing to give it.
	it('keys the index without compiling when asked not to', async () => {
		const index = makeIndex();
		await index.build({ compile: false });

		expect(Object.keys(index.all())).toContain('/css/index.css');
		expect(cssCalls).toEqual([]);
		expect(index.get('/css/index.css').url).toBe('/css/index.css');
		expect(index.get('/css/index.css').hash).toBeUndefined();
	});

	describe('entryPoints', () => {
		it('replaces the convention for the kind it names', async () => {
			const index = makeIndex({ js: ['vendor/index.js'] });
			await index.build();

			expect(Object.keys(index.all()).sort()).toEqual(['/css/index.css', '/js/vendor/index.js']);
		});

		// Per-kind, so naming css entries leaves js on the convention. The dates
		// source lists work the same way: fields left out keep their defaults.
		it('leaves the other kind on the convention', async () => {
			const index = makeIndex({ css: ['index.css'] });
			await index.build();

			expect(Object.keys(index.all())).toContain('/js/vendor/index.js');
		});

		// The reason the compile guards had to stop checking the basename
		// themselves: a declared entry can be called anything.
		it('accepts an entry the convention would never find', async () => {
			fs.writeFileSync(path.join(root, 'css/main.css'), '.main{}');
			const index = makeIndex({ css: ['main.css'] });
			await index.build();

			expect(Object.keys(index.all())).toContain('/css/main.css');
			expect(index.isEntry(`${deps.cssDirectory}main.css`)).toBe(true);
			expect(index.isEntry(`${deps.cssDirectory}index.css`)).toBe(false);
		});

		it('scans when the list is absent, and emits nothing for an empty one', async () => {
			const scanned = makeIndex();
			await scanned.build();
			const declaredNone = makeIndex({ css: [], js: [] });
			await declaredNone.build();

			expect(Object.keys(scanned.all()).length).toBeGreaterThan(0);
			expect(declaredNone.all()).toEqual({});
		});
	});

	describe('manifest', () => {
		// `content` is what the compile guards read. In the cascade it would carry
		// every asset's bytes into every page's data and the navigator's dump.
		it('leaves the compiled bytes out', async () => {
			const index = makeIndex();
			await index.build();
			const entry = index.manifest()['/css/index.css'];

			expect(Object.keys(entry).sort()).toEqual(['hash', 'integrity', 'size', 'url']);
			expect(index.get('/css/index.css').content).toBeDefined();
		});

		it('keys it the same way the index is keyed', async () => {
			const index = makeIndex();
			await index.build();

			expect(Object.keys(index.manifest())).toEqual(Object.keys(index.all()));
		});

		it('is empty before the first build', async () => {
			const index = makeIndex();

			expect(index.manifest()).toEqual({});
		});
	});

	it('is empty before the first build', () => {
		const index = makeIndex();

		expect(index.all()).toEqual({});
		expect(index.get('/css/index.css')).toBeUndefined();
	});
});
