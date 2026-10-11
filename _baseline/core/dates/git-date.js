import { execFileSync } from 'node:child_process';
import path from 'node:path';

let cache = null;

/**
 * Whether the repository has only part of its history, in which case every
 * file reports the same commit and git is no use as a date source.
 */
function isShallow() {
	try {
		const out = execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore']
		});
		return out.trim() === 'true';
	} catch {
		return false;
	}
}

// One `git log` walk into two { repoRelativePath: ISO date } maps. Newest
// first, so the first date seen per path is the last commit and the last is
// the first. The author date, not the committer date: a rebase rewrites the
// committer date of commits whose content never changed.
function buildCache() {
	const modified = new Map();
	const created = new Map();
	const marker = '__BASELINE_COMMIT__';
	let raw;

	if (isShallow()) return { modified, created, shallow: true };

	try {
		raw = execFileSync(
			'git',
			['log', '--name-only', '--no-renames', `--pretty=format:${marker}%aI`],
			{
				encoding: 'utf8',
				maxBuffer: 64 * 1024 * 1024,
				// Swallow git's stderr. Outside a repo it writes "fatal: not a git
				// repository" straight to the terminal before throwing, which reads
				// as a build failure in a build that is fine without git.
				stdio: ['ignore', 'pipe', 'ignore']
			}
		);
	} catch {
		return { modified, created, shallow: false };
	}

	let currentDate = null;
	for (const line of raw.split('\n')) {
		if (line.startsWith(marker)) {
			// Normalise to UTC so all outputs (sitemap, JSON-LD, schemamap) match.
			currentDate = new Date(line.slice(marker.length)).toISOString();
		} else if (line && currentDate) {
			if (!modified.has(line)) modified.set(line, currentDate);
			created.set(line, currentDate);
		}
	}
	return { modified, created, shallow: false };
}

function normalize(inputPath) {
	const abs = path.resolve(inputPath);
	const rel = path.relative(process.cwd(), abs);
	return rel.split(path.sep).join('/');
}

/**
 * Last-commit date (UTC ISO) for a file, or `null` when git has no record of
 * it: untracked, no repository, or a shallow clone. No fallback of any kind,
 * so resolution falls through to the next source rather than inventing one.
 *
 * @param {string} inputPath
 * @returns {string | null}
 */
export function gitModified(inputPath) {
	if (!cache) cache = buildCache();
	return cache.modified.get(normalize(inputPath)) ?? null;
}

/**
 * First-commit date (UTC ISO) for a file, on the same terms.
 *
 * @param {string} inputPath
 * @returns {string | null}
 */
export function gitCreated(inputPath) {
	if (!cache) cache = buildCache();
	return cache.created.get(normalize(inputPath)) ?? null;
}

/** Whether git was usable as a date source at all. */
export function gitIsShallow() {
	if (!cache) cache = buildCache();
	return cache.shallow;
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
