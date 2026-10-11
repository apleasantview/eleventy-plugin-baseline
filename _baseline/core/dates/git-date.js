import { execFileSync } from 'node:child_process';
import path from 'node:path';

let cache = null;

// A partial history reports the same commit for every file, so git is no use.
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

// One `git log` walk into two { repoRelativePath: ISO date } maps. Newest first,
// so the first date per path is the last commit. Author date, not committer.
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
				// Swallowed stderr: outside a repo git prints a fatal that is not one.
				stdio: ['ignore', 'pipe', 'ignore']
			}
		);
	} catch {
		return { modified, created, shallow: false };
	}

	let currentDate = null;
	for (const line of raw.split('\n')) {
		if (line.startsWith(marker)) {
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
 * Last-commit date (UTC ISO), or `null` when git has no record of the file.
 * No fallback, so resolution falls through to the next source.
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

/**
 * Whether git can answer here: `shallow` when the history is partial, `none`
 * when there is no history to read, `ok` otherwise.
 *
 * @returns {'ok' | 'shallow' | 'none'}
 */
export function gitAvailability() {
	if (!cache) cache = buildCache();
	if (cache.shallow) return 'shallow';
	return cache.modified.size > 0 ? 'ok' : 'none';
}
