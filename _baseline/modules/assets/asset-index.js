import { createHash } from 'node:crypto';
import path from 'node:path';
import { createHashHexSync } from '@11ty/eleventy-utils';
import { addTrailingSlash } from '../../core/utils/add-trailing-slash.js';
import { findEntries } from './utils/find-entries.js';

const HASH_LENGTH = 8;

/**
 * Asset index (module)
 *
 * What each processed entry compiled to, keyed by the root-relative path an
 * author writes. Built once per build, before any page renders, so head can
 * resolve a declared `href` to the file that actually exists.
 *
 * Architecture layer:
 *   module
 *
 * System role:
 *   The only place that knows an entry's output name. Head reads it to rewrite
 *   a declaration; `_assets` exposes it; hashed filenames come from it.
 *
 * Lifecycle:
 *   build-time → `eleventy.before` rebuilds the whole index
 *
 * Why this exists:
 *   The compile guards recognise an entry when Eleventy hands one over, which
 *   is too late and too partial to name an output file by its contents.
 *
 * Scope:
 *   Owns entry discovery, one compile per entry, and the hash. Does not own
 *   what any consumer does with it, which processor runs, or output paths.
 *
 * Data flow:
 *   find-entries → processor → hash → index → head, `_assets`, permalinks
 *
 * @param {Object} deps
 * @param {string} deps.inputDirectory - Eleventy's input dir, for deriving keys.
 * @param {Array<{ directory: string, basename: string, entryPoints?: string[], compile: (inputPath: string) => Promise<string> | string }>} deps.sources
 * @returns {{ build: (options?: { compile?: boolean }) => Promise<void>, isEntry: (inputPath: string) => boolean, get: (key: string) => object | undefined, getByInput: (inputPath: string) => object | undefined, all: () => Record<string, object>, manifest: () => Record<string, object> }}
 */
export function createAssetIndex({ inputDirectory, sources = [], publicPrefix, log }) {
	let entries = new Map();
	const reported = new Set();

	/** The path an author writes, which is what head and the filter look up. */
	function keyFor(inputPath) {
		const relative = path.relative(inputDirectory ?? '.', inputPath);
		return `/${relative.split(path.sep).join('/')}`;
	}

	// A declared list replaces that source's convention rather than adding to it,
	// so what is written is exactly what runs. Paths are relative to the source's
	// own directory, so `['vendor/index.js']`, not `['assets/js/vendor/index.js']`.
	function entriesFor({ directory, basename, entryPoints }) {
		if (!Array.isArray(entryPoints)) return findEntries(directory, basename);
		const root = addTrailingSlash(directory);
		return entryPoints.map((relative) => `${root}${relative}`);
	}

	function discover() {
		return sources.flatMap((source) => entriesFor(source).map((inputPath) => ({ inputPath, compile: source.compile })));
	}

	/** `/assets/css/index.css` plus a hash becomes `/assets/css/index.a1b2c3d4.css`. */
	function fingerprinted(key, hash) {
		const extension = path.extname(key);
		return `${key.slice(0, -extension.length)}.${hash}${extension}`;
	}

	/**
	 * Rebuilt whole, so the lifetime is one build and nothing needs invalidating.
	 * `compile: false` keys the index without running a processor, which is dev.
	 */
	async function build({ compile = true, fingerprint = false } = {}) {
		const next = new Map();
		reported.clear();

		for (const entry of discover()) {
			const key = keyFor(entry.inputPath);

			if (!compile) {
				next.set(key, { key, url: key, inputPath: entry.inputPath });
				continue;
			}

			const content = await entry.compile(entry.inputPath);
			const hash = createHashHexSync(content).slice(0, HASH_LENGTH);

			next.set(key, {
				key,
				// The authored path, or the hashed one. Everything downstream reads
				// this rather than deciding again.
				url: fingerprint ? fingerprinted(key, hash) : key,
				inputPath: entry.inputPath,
				hash,
				// SRI wants base64 of the digest, which the hex helper cannot give.
				integrity: `sha384-${createHash('sha384').update(content).digest('base64')}`,
				size: Buffer.byteLength(content),
				content
			});
		}

		entries = next;
	}

	/**
	 * A declared path's real URL, or the path untouched. A miss inside the assets
	 * directory is worth one line: a typo and an unmanaged path look the same here.
	 */
	function resolve(href) {
		if (typeof href !== 'string') return href;

		const entry = entries.get(href);
		if (entry) return entry.url;

		if (publicPrefix && href.startsWith(publicPrefix) && !reported.has(href)) {
			reported.add(href);
			log?.info?.(`${href} is not an asset entry point, emitting it as written`);
		}

		return href;
	}

	return {
		build,
		resolve,
		// The one definition of what an entry is, which the compile guards read so
		// the convention is not spelled out in three places.
		isEntry: (inputPath) => entries.has(keyFor(inputPath)),
		get: (key) => entries.get(key),
		// For the compile guards, which hold an input path rather than a URL.
		getByInput: (inputPath) => entries.get(keyFor(inputPath)),
		all: () => Object.fromEntries(entries),
		// `content` is the compile guards' business. In the cascade it would carry
		// every asset's bytes into every page and the navigator's dump.
		manifest: () =>
			Object.fromEntries(
				[...entries].map(([key, entry]) => [
					key,
					{ url: entry.url, hash: entry.hash, integrity: entry.integrity, size: entry.size }
				])
			)
	};
}
