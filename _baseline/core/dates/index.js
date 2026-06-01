/**
 * Dates substrate
 *
 * One home for date concerns: the Nunjucks `date` global (formatting), the
 * git-backed last-commit lookup, and `resolveDates` — the single source for a
 * page's publish/modified dates that the seo-graph substrate and any other
 * consumer read from instead of re-deriving the chain.
 */

import { gitModified, maxGitModified } from './git-date.js';

export { registerDateGlobal } from './date-global.js';
export { gitModified, maxGitModified };

/** Coerce a value to a valid `Date`, or `undefined` if it can't be parsed. */
function toDate(value) {
	if (!value) return undefined;
	const d = value instanceof Date ? value : new Date(value);
	return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Resolve a page's publish and modified dates from one place. All three author
 * keys are optional; the chain degrades to `page.date`, which Eleventy always
 * backfills (front matter, else file birthtime), so output is never empty.
 *
 * - `datePublished` → front-matter `datePublished` → `page.date` (the floor).
 * - `dateModified` → front-matter `dateModified` → git last-commit → resolved
 *   `datePublished`.
 *
 * `git-date` is the middle rung of the modified chain and is allowed to yield
 * nothing; flooring `dateModified` to the *resolved* `datePublished` (not raw
 * `page.date`) keeps the pair coherent when an author overrides `datePublished`.
 * No clamp to `modified >= published`: a scheduled post can legitimately be
 * modified before its publish date.
 *
 * Takes the full cascade `data` bag (matches the substrate convention) and
 * returns normalised `Date` objects, ready for the seo-graph piece builders.
 *
 * `gitLookup` is an injection seam for tests; production calls pass `data` only
 * and get the real git-backed lookup.
 *
 * @param {{ page?: any, datePublished?: unknown, dateModified?: unknown }} data
 * @param {(inputPath: string) => string | null} [gitLookup]
 * @returns {{ datePublished: Date | undefined, dateModified: Date | undefined }}
 */
export function resolveDates(data, gitLookup = gitModified) {
	const page = data?.page ?? {};
	const datePublished = toDate(data?.datePublished) ?? toDate(page.date);
	const dateModified =
		toDate(data?.dateModified) ??
		toDate(page.inputPath ? gitLookup(page.inputPath) : null) ??
		datePublished;
	return { datePublished, dateModified };
}
