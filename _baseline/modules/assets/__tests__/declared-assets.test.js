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
});
