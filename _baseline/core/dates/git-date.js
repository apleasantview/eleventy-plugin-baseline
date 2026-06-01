import { execFileSync } from 'node:child_process';
import path from 'node:path';

let cache = null;

// Build a { repoRelativePath: ISO date } map from one `git log` walk.
// Each commit emits its date, then the files it touched; first date wins
// because git log is newest-first.
function buildCache() {
	const map = new Map();
	const marker = '__BASELINE_COMMIT__';
	let raw;
	try {
		raw = execFileSync(
			'git',
			['log', '--name-only', '--no-renames', `--pretty=format:${marker}%cI`],
			{ encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
		);
	} catch {
		return map;
	}

	let currentDate = null;
	for (const line of raw.split('\n')) {
		if (line.startsWith(marker)) {
			// Normalise to UTC so all outputs (sitemap, JSON-LD, schemamap) match.
			currentDate = new Date(line.slice(marker.length)).toISOString();
		} else if (line && currentDate && !map.has(line)) {
			map.set(line, currentDate);
		}
	}
	return map;
}

function normalize(inputPath) {
	const abs = path.resolve(inputPath);
	const rel = path.relative(process.cwd(), abs);
	return rel.split(path.sep).join('/');
}

/**
 * Last-commit date (UTC ISO) for a file, or `null` when git has no record of
 * it (untracked, or no git history available — e.g. a shallow CI clone).
 *
 * Unlike the docs-site copy this carries no mtime/now fallback: the date floor
 * is `page.date`, applied by `resolveDates`, so this stays a pure "what does
 * git say, or nothing" lookup.
 *
 * @param {string} inputPath
 * @returns {string | null}
 */
export function gitModified(inputPath) {
	if (!cache) cache = buildCache();
	return cache.get(normalize(inputPath)) ?? null;
}

/**
 * The most recent `gitModified` across several paths, or `null` if none resolve.
 *
 * @param {Array<string | undefined | null>} inputPaths
 * @returns {string | null}
 */
export function maxGitModified(inputPaths) {
	let max = null;
	for (const p of inputPaths) {
		if (!p) continue;
		const iso = gitModified(p);
		if (iso && (!max || iso > max)) max = iso;
	}
	return max;
}
