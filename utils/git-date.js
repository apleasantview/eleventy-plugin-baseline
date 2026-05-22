import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

let cache = null;

// Build a { repoRelativePath: ISO date } map from one `git log` walk.
// Each commit emits its date, then the files it touched; first date wins
// because git log is newest-first.
function buildCache() {
	const map = new Map();
	const marker = '__APV_COMMIT__';
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

export function gitModified(inputPath) {
	if (!cache) cache = buildCache();
	const key = normalize(inputPath);
	const iso = cache.get(key);
	if (iso) return iso;
	// Untracked or uncommitted-new file: fall back to mtime so previews still render.
	try {
		return new Date(fs.statSync(inputPath).mtimeMs).toISOString();
	} catch {
		return new Date().toISOString();
	}
}

export function maxGitModified(inputPaths) {
	let max = null;
	for (const p of inputPaths) {
		if (!p) continue;
		const iso = gitModified(p);
		if (!max || iso > max) max = iso;
	}
	return max;
}
