import { DateTime } from 'luxon';

/**
 * Date resolution
 *
 * Ordered sources per field, then classification. A calendar date stays a
 * calendar date; everything else becomes a UTC instant.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const FILENAME_DATE = /(\d{4}-\d{2}-\d{2})/;

export const DEFAULT_SOURCES = {
	datePublished: ['datePublished', 'date', ':filename'],
	dateModified: ['dateModified', 'modified', 'updated', ':git-modified', ':datePublished']
};

/**
 * @typedef {{ kind: 'date' | 'instant', value: string, source: string }} ResolvedDate
 */

// One exit for both branches, so an instant has one spelling.
const toInstant = (dt) => dt.toUTC().toISO({ suppressMilliseconds: true });

function isUtcMidnight(d) {
	return (
		d.getUTCHours() === 0 &&
		d.getUTCMinutes() === 0 &&
		d.getUTCSeconds() === 0 &&
		d.getUTCMilliseconds() === 0
	);
}

/**
 * Attach a kind to a raw value, or undefined when it carries no usable date.
 * A `Date` at UTC midnight is a calendar date: that is what js-yaml makes of
 * `2026-10-08`.
 *
 * @param {unknown} raw
 * @param {string} timeZone - Anchor for a date-time carrying no offset.
 * @returns {{ kind: 'date' | 'instant', value: string } | undefined}
 */
export function classify(raw, timeZone = 'UTC') {
	if (raw === null || raw === undefined || raw === '') return undefined;

	if (raw instanceof Date) {
		if (Number.isNaN(raw.getTime())) return undefined;
		if (isUtcMidnight(raw)) return { kind: 'date', value: raw.toISOString().slice(0, 10) };
		return { kind: 'instant', value: toInstant(DateTime.fromJSDate(raw)) };
	}

	if (typeof raw !== 'string') return undefined;

	const trimmed = raw.trim();
	if (DATE_ONLY.test(trimmed)) return { kind: 'date', value: trimmed };

	const dt = DateTime.fromISO(trimmed, { zone: timeZone });
	if (!dt.isValid) return undefined;

	return { kind: 'instant', value: toInstant(dt) };
}

function fromFilename(inputPath) {
	const match = typeof inputPath === 'string' ? inputPath.match(FILENAME_DATE) : null;
	return match ? match[1] : undefined;
}

function rawFor(token, { data, git, published }) {
	if (!token.startsWith(':')) return data?.[token];
	if (token === ':datePublished') return published?.value;

	// A virtual template has no input path, so nothing file-derived applies.
	const inputPath = data?.page?.inputPath;
	if (!inputPath) return undefined;

	if (token === ':filename') return fromFilename(inputPath);
	if (token === ':git-created') return git?.created?.(inputPath);
	if (token === ':git-modified') return git?.modified?.(inputPath);
	return undefined;
}

function resolveField(tokens, context) {
	for (const token of tokens) {
		const raw = rawFor(token, context);
		if (raw === null || raw === undefined || raw === '') continue;

		const classified = classify(raw, context.timeZone);
		if (classified) return { ...classified, source: token };

		const warn = context.log?.warnOnce ?? context.log?.warn;
		warn?.(
			`Unparseable date "${raw}" from ${token} on ${context.data?.page?.inputPath ?? 'unknown page'}, skipping it`
		);
	}
	return undefined;
}

/**
 * Resolve a page's published and modified dates. Never invents one: a field
 * with no resolvable source stays undefined rather than taking the build time.
 *
 * @param {object} data - The page's cascade data.
 * @param {object} [context]
 * @param {string} [context.timeZone='UTC']
 * @param {{ datePublished: string[], dateModified: string[] }} [context.sources]
 * @param {{ created?: (p: string) => string | null, modified?: (p: string) => string | null }} [context.git]
 * @param {{ warn?: Function }} [context.log]
 * @returns {{ datePublished: ResolvedDate | undefined, dateModified: ResolvedDate | undefined }}
 */
export function resolveDates(data, context = {}) {
	const { timeZone = 'UTC', sources = DEFAULT_SOURCES, git, log } = context;
	const shared = { data, git, log, timeZone };

	const datePublished = resolveField(sources.datePublished ?? [], shared);
	const dateModified = resolveField(sources.dateModified ?? [], { ...shared, published: datePublished });

	return { datePublished, dateModified };
}
