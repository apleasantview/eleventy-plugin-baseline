import { createHash } from 'node:crypto';
import path from 'node:path';
import { createHashHexSync } from '@11ty/eleventy-utils';
import assetsESbuild from './processors/esbuild-process.js';
import assetsPostCSS from './processors/postcss-process.js';
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
 *   what any consumer does with it, and does not decide output paths.
 *
 * Data flow:
 *   find-entries → processor → hash → index → head, `_assets`, permalinks
 *
 * @param {Object} deps
 * @param {string} deps.inputDirectory - Eleventy's input dir, for deriving keys.
 * @param {string} deps.cssDirectory
 * @param {string} deps.jsDirectory
 * @param {Object} [deps.esbuildOptions]
 * @param {{ css?: Function, js?: Function }} [deps.processors] - Injection seam for tests.
 * @returns {{ build: (options?: { compile?: boolean }) => Promise<void>, get: (key: string) => object | undefined, all: () => Record<string, object> }}
 */
export function createAssetIndex({ inputDirectory, cssDirectory, jsDirectory, esbuildOptions = {}, processors = {} }) {
	const compileCss = processors.css ?? ((inputPath) => assetsPostCSS(inputPath));
	const compileJs = processors.js ?? ((inputPath) => assetsESbuild(inputPath, esbuildOptions));

	let entries = new Map();

	/** The path an author writes, which is what head and the filter look up. */
	function keyFor(inputPath) {
		const relative = path.relative(inputDirectory ?? '.', inputPath);
		return `/${relative.split(path.sep).join('/')}`;
	}

	function discover() {
		return [
			...findEntries(cssDirectory, 'index.css').map((inputPath) => ({ inputPath, compile: compileCss })),
			...findEntries(jsDirectory, 'index.js').map((inputPath) => ({ inputPath, compile: compileJs }))
		];
	}

	/**
	 * Rebuilt whole, so the lifetime is one build and nothing needs invalidating.
	 * `compile: false` keys the index without running a processor, which is dev.
	 */
	async function build({ compile = true } = {}) {
		const next = new Map();

		for (const entry of discover()) {
			const key = keyFor(entry.inputPath);

			if (!compile) {
				next.set(key, { key, url: key, inputPath: entry.inputPath });
				continue;
			}

			const content = await entry.compile(entry.inputPath);
			next.set(key, {
				key,
				// Stays the authored path until fingerprinting turns it into the
				// hashed one, so the lookup is a no-op until then.
				url: key,
				inputPath: entry.inputPath,
				hash: createHashHexSync(content).slice(0, HASH_LENGTH),
				// SRI wants base64 of the digest, which the hex helper cannot give.
				integrity: `sha384-${createHash('sha384').update(content).digest('base64')}`,
				size: Buffer.byteLength(content),
				content
			});
		}

		entries = next;
	}

	return {
		build,
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
