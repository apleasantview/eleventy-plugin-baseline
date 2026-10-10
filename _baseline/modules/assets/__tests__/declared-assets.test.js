import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { collectDeclaredPaths, findMissingAssets } from '../utils/declared-assets.js';

describe('collectDeclaredPaths', () => {
	it('takes link hrefs and script srcs together', () => {
		const paths = collectDeclaredPaths({
			link: [{ href: '/assets/css/index.css' }],
			script: [{ src: '/assets/js/index.js' }]
		});

		expect(paths).toEqual(['/assets/css/index.css', '/assets/js/index.js']);
	});

	// Somebody else's origin is not this build's to account for.
	it('skips absolute URLs', () => {
		const paths = collectDeclaredPaths({
			link: [{ href: 'https://fonts.googleapis.com/css2?family=X' }, { href: '/local.css' }]
		});

		expect(paths).toEqual(['/local.css']);
	});

	it('survives a missing head, and entries with nothing to load', () => {
		expect(collectDeclaredPaths(undefined)).toEqual([]);
		expect(collectDeclaredPaths({})).toEqual([]);
		expect(collectDeclaredPaths({ link: [{ rel: 'preconnect' }] })).toEqual([]);
	});
});

describe('findMissingAssets', () => {
	let outputDir;

	beforeAll(() => {
		outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'baseline-assets-'));
		fs.mkdirSync(path.join(outputDir, 'assets', 'css'), { recursive: true });
		fs.writeFileSync(path.join(outputDir, 'assets', 'css', 'index.css'), 'a{}');
	});

	afterAll(() => {
		fs.rmSync(outputDir, { recursive: true, force: true });
	});

	it('reports only what the build did not emit', () => {
		const missing = findMissingAssets(['/assets/css/index.css', '/assets/css/local/index.css'], outputDir);

		expect(missing).toEqual(['/assets/css/local/index.css']);
	});

	// The eleventy-excellent run declared an entry point that did not exist and
	// every page rendered a <link> to a 404, on a green build.
	it('reports a declaration nothing emits', () => {
		expect(findMissingAssets(['/nope.css'], outputDir)).toEqual(['/nope.css']);
	});

	it('ignores a query string or fragment, which address rather than name', () => {
		expect(findMissingAssets(['/assets/css/index.css?v=2'], outputDir)).toEqual([]);
		expect(findMissingAssets(['/assets/css/index.css#top'], outputDir)).toEqual([]);
	});

	it('says nothing when there is no output directory to look in', () => {
		expect(findMissingAssets(['/nope.css'], undefined)).toEqual([]);
	});

	// Fingerprinting broke this check the day it shipped: every declared entry
	// was reported missing, because the build writes the hashed name.
	describe('with fingerprinted output', () => {
		const resolve = (href) =>
			href === '/assets/css/index.css' ? '/assets/css/index.342303cd.css' : href;

		// Its own directory, holding the hashed file and not the declared one.
		// Sharing the outer fixture would leave `index.css` on disk, and the
		// assertion would pass whether the resolver were consulted or not.
		let hashedDir;

		beforeAll(() => {
			hashedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'baseline-hashed-'));
			fs.mkdirSync(path.join(hashedDir, 'assets', 'css'), { recursive: true });
			fs.writeFileSync(path.join(hashedDir, 'assets', 'css', 'index.342303cd.css'), 'a{}');
		});

		afterAll(() => {
			fs.rmSync(hashedDir, { recursive: true, force: true });
		});

		it('clears a declaration the build wrote under its hashed name', () => {
			expect(findMissingAssets(['/assets/css/index.css'], hashedDir, resolve)).toEqual([]);
		});

		// The warning has to survive the fix, or it stops being able to report the
		// case it exists for.
		it('still reports one the build never wrote', () => {
			expect(findMissingAssets(['/nope.css'], hashedDir, resolve)).toEqual(['/nope.css']);
		});

		// A stale hash is the case that would otherwise ship silently: the index
		// names a file the build did not write.
		it('reports a resolved name that is not on disk', () => {
			const stale = () => '/assets/css/index.deadbeef.css';

			expect(findMissingAssets(['/assets/css/index.css'], hashedDir, stale)).toEqual([
				'/assets/css/index.css'
			]);
		});
	});
});
