import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { findEntries } from '../utils/find-entries.js';

describe('findEntries', () => {
	let root;
	let cssDirectory;
	let jsDirectory;

	beforeAll(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), 'baseline-entries-'));

		const write = (relative, content) => {
			const file = path.join(root, relative);
			fs.mkdirSync(path.dirname(file), { recursive: true });
			fs.writeFileSync(file, content);
		};

		write('css/index.css', 'a{}');
		write('css/_partial.css', 'b{}');
		write('css/print/index.css', 'c{}');
		write('js/index.js', 'let a;');
		write('js/lib.js', 'let b;');
		write('js/vendor/index.js', 'let c;');
		write('js/vendor/deep/index.js', 'let d;');

		cssDirectory = `${root.split(path.sep).join('/')}/css/`;
		jsDirectory = `${root.split(path.sep).join('/')}/js/`;
	});

	afterAll(() => {
		fs.rmSync(root, { recursive: true, force: true });
	});

	it('finds an entry at the top of the directory', () => {
		expect(findEntries(cssDirectory, 'index.css')).toContain(`${cssDirectory}index.css`);
	});

	// This docs site has `js/index.js` and `js/vendor/index.js`, so a scan that
	// stops at the top level would miss an entry that compiles today.
	it('finds nested entries, at any depth', () => {
		expect(findEntries(jsDirectory, 'index.js')).toEqual([
			`${jsDirectory}index.js`,
			`${jsDirectory}vendor/deep/index.js`,
			`${jsDirectory}vendor/index.js`
		]);
	});

	it('ignores files that are not entries', () => {
		const found = findEntries(cssDirectory, 'index.css');

		expect(found).not.toContain(`${cssDirectory}_partial.css`);
		expect(found).toHaveLength(2);
	});

	// The index these feed decides output filenames, and a reproducible build
	// was a release's worth of work. Order is part of the contract.
	it('returns them sorted', () => {
		const found = findEntries(jsDirectory, 'index.js');

		expect(found).toEqual([...found].sort());
	});

	// The shape Eleventy actually hands over. `directories.assets` is dot-prefixed
	// and relative to cwd, and Node returns `parentPath` normalised without that
	// prefix, so slicing by the input's length ate the first character of a
	// nested directory: `js/vendor/index.js` came back as `js/endor/index.js`.
	it('keeps nested paths intact when the directory is relative and dot-prefixed', () => {
		const cwd = process.cwd();

		try {
			process.chdir(root);
			expect(findEntries('./js/', 'index.js')).toEqual([
				'./js/index.js',
				'./js/vendor/deep/index.js',
				'./js/vendor/index.js'
			]);
		} finally {
			process.chdir(cwd);
		}
	});

	// The module builds these by concatenation (`${assetsDirectory}css/`), so the
	// slash is always there in practice. Accepting both shapes means the contract
	// has no precondition to get wrong.
	it('accepts a directory with no trailing slash', () => {
		expect(findEntries(cssDirectory.replace(/\/$/, ''), 'index.css')).toEqual(findEntries(cssDirectory, 'index.css'));
	});

	it('treats a missing directory as no entries rather than an error', () => {
		expect(findEntries(`${root}/nope/`, 'index.css')).toEqual([]);
	});

	it('returns nothing without a directory or a basename', () => {
		expect(findEntries(undefined, 'index.css')).toEqual([]);
		expect(findEntries(cssDirectory, undefined)).toEqual([]);
	});
});
