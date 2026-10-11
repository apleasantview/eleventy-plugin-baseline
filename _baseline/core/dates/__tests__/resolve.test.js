import { describe, it, expect, vi } from 'vitest';
import { classify, resolveDates, DEFAULT_SOURCES } from '../resolve.js';

const page = (inputPath = './src/a.md') => ({ page: { inputPath } });

describe('classify', () => {
	it('keeps a date-only string a calendar date', () => {
		expect(classify('2026-10-08')).toEqual({ kind: 'date', value: '2026-10-08' });
	});

	// What js-yaml hands over for an unquoted `2026-10-08`, and the one signal
	// left that the author wrote a day rather than a moment.
	it('reads a UTC-midnight Date as a calendar date', () => {
		expect(classify(new Date('2026-10-08T00:00:00Z'))).toEqual({
			kind: 'date',
			value: '2026-10-08'
		});
	});

	it('reads any other Date as an instant', () => {
		expect(classify(new Date('2026-10-08T14:30:00Z'))).toEqual({
			kind: 'instant',
			value: '2026-10-08T14:30:00Z'
		});
	});

	it('keeps an offset date-time as an instant, normalised to UTC', () => {
		expect(classify('2026-10-08T14:30:00+02:00')).toEqual({
			kind: 'instant',
			value: '2026-10-08T12:30:00Z'
		});
	});

	// The only place timeZone changes a classification.
	it('anchors an offset-less date-time in the given zone', () => {
		expect(classify('2026-10-08T14:30', 'Europe/Amsterdam')).toEqual({
			kind: 'instant',
			value: '2026-10-08T12:30:00Z'
		});
		expect(classify('2026-10-08T14:30', 'UTC')).toEqual({
			kind: 'instant',
			value: '2026-10-08T14:30:00Z'
		});
	});

	it('refuses what it cannot read', () => {
		expect(classify('October 8, 2026')).toBeUndefined();
		expect(classify(new Date('nope'))).toBeUndefined();
		expect(classify('')).toBeUndefined();
		expect(classify(undefined)).toBeUndefined();
		expect(classify(42)).toBeUndefined();
	});
});

describe('resolveDates', () => {
	it('takes the first source with a value and says which', () => {
		const { datePublished } = resolveDates({ ...page(), date: '2026-10-08' });

		expect(datePublished).toEqual({ kind: 'date', value: '2026-10-08', source: 'date' });
	});

	it('prefers the author key over the shorter one', () => {
		const { datePublished } = resolveDates({
			...page(),
			datePublished: '2026-01-01',
			date: '2026-10-08'
		});

		expect(datePublished.value).toBe('2026-01-01');
	});

	it('reads a filename prefix', () => {
		const { datePublished } = resolveDates(page('./src/posts/2026-10-08-hello.md'));

		expect(datePublished).toEqual({ kind: 'date', value: '2026-10-08', source: ':filename' });
	});

	// The strict default: no git-created rung, no page.date floor, nothing
	// invented. This is the bug a consumer filed, where every page shared one
	// deploy-time published date.
	it('leaves an undated page undated', () => {
		const { datePublished, dateModified } = resolveDates(page());

		expect(datePublished).toBeUndefined();
		expect(dateModified).toBeUndefined();
	});

	it('floors modified to published rather than inventing one', () => {
		const { dateModified } = resolveDates({ ...page(), date: '2026-10-08' });

		expect(dateModified).toEqual({
			kind: 'date',
			value: '2026-10-08',
			source: ':datePublished'
		});
	});

	it('prefers the author over git for modified', () => {
		const git = { modified: () => '2026-12-01T09:00:00Z' };
		const { dateModified } = resolveDates({ ...page(), modified: '2026-10-09' }, { git });

		expect(dateModified.source).toBe('modified');
	});

	it('takes git when the author said nothing', () => {
		const git = { modified: () => '2026-12-01T09:00:00Z' };
		const { dateModified } = resolveDates({ ...page(), date: '2026-10-08' }, { git });

		expect(dateModified).toEqual({
			kind: 'instant',
			value: '2026-12-01T09:00:00Z',
			source: ':git-modified'
		});
	});

	it('skips a source it cannot parse and warns once', () => {
		const log = { warn: vi.fn() };
		const { datePublished } = resolveDates(
			{ ...page(), datePublished: 'last tuesday', date: '2026-10-08' },
			{ log }
		);

		expect(datePublished.source).toBe('date');
		expect(log.warn).toHaveBeenCalledTimes(1);
		expect(log.warn.mock.calls[0][0]).toContain('last tuesday');
	});

	it('takes a given source list over the default', () => {
		const { datePublished } = resolveDates(
			{ ...page(), pubDate: '2026-10-08', date: '2026-01-01' },
			{ sources: { datePublished: ['pubDate'] } }
		);

		expect(datePublished.source).toBe('pubDate');
	});

	it('resolves nothing for a field with an empty list', () => {
		const { datePublished } = resolveDates(
			{ ...page(), date: '2026-10-08' },
			{ sources: { datePublished: [] } }
		);

		expect(datePublished).toBeUndefined();
	});

	it('ships the documented defaults', () => {
		expect(DEFAULT_SOURCES.datePublished).toEqual(['datePublished', 'date', ':filename']);
		expect(DEFAULT_SOURCES.dateModified).toEqual([
			'dateModified',
			'modified',
			'updated',
			':git-modified',
			':datePublished'
		]);
	});
});

// A virtual template reaches resolution with no input path, and the derived
// sources all read the file. Calling git with undefined threw from inside
// `path.relative` and took four unrelated tests down with it.
describe('a page with no input path', () => {
	it('skips every file-derived source without throwing', () => {
		const git = { modified: () => '2026-12-01T09:00:00Z', created: () => '2026-01-01T00:00:00Z' };
		const { datePublished, dateModified } = resolveDates(
			{ page: { url: '/virtual/' } },
			{ git, sources: { datePublished: [':filename', ':git-created'], dateModified: [':git-modified'] } }
		);

		expect(datePublished).toBeUndefined();
		expect(dateModified).toBeUndefined();
	});

	it('still reads front matter', () => {
		const { datePublished } = resolveDates({ page: {}, date: '2026-10-08' });

		expect(datePublished.value).toBe('2026-10-08');
	});
});

// The rig caught this: the same instant arrived with milliseconds through the
// Date branch and without through the string one, so one page's published and
// modified dates disagreed in shape.
describe('instant spelling', () => {
	it('is the same whichever branch produced it', () => {
		const fromDate = classify(new Date('2026-10-08T12:30:00Z'));
		const fromString = classify('2026-10-08T14:30:00+02:00');

		expect(fromDate.value).toBe('2026-10-08T12:30:00Z');
		expect(fromString.value).toBe(fromDate.value);
	});
});
