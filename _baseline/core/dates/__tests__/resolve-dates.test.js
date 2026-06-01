import { describe, expect, it } from 'vitest';
import { resolveDates } from '../index.js';

// A page.date Eleventy would have already resolved (the floor).
const published = new Date('2026-05-17T00:00:00.000Z');

// Stand-in git lookups. The chain's "git rung" is injected so these stay
// hermetic — no real `git log` runs. A real consumer omits the second arg.
const gitHit = () => '2026-05-30T12:00:00.000Z';
const gitMiss = () => null;

describe('resolveDates', () => {
	it('takes datePublished from page.date', () => {
		const { datePublished } = resolveDates({ page: { date: published } }, gitMiss);
		expect(datePublished).toEqual(published);
	});

	it('coerces a string page.date to a Date', () => {
		const { datePublished } = resolveDates({ page: { date: '2026-05-17' } }, gitMiss);
		expect(datePublished).toBeInstanceOf(Date);
		expect(datePublished.toISOString()).toBe('2026-05-17T00:00:00.000Z');
	});

	it('lets front-matter datePublished win over page.date', () => {
		const override = new Date('2026-05-20T00:00:00.000Z');
		const { datePublished } = resolveDates(
			{ page: { date: published }, datePublished: override },
			gitMiss
		);
		expect(datePublished).toEqual(override);
	});

	it('floors dateModified to the resolved datePublished, not raw page.date', () => {
		const publishedOverride = new Date('2026-05-20T00:00:00.000Z');
		const { dateModified } = resolveDates(
			{ page: { date: published, inputPath: './a.md' }, datePublished: publishedOverride },
			gitMiss // no git record → must floor to the overridden datePublished
		);
		expect(dateModified).toEqual(publishedOverride);
	});

	it('lets front-matter dateModified win over git and the floor', () => {
		const override = new Date('2026-06-01T09:00:00.000Z');
		const { dateModified } = resolveDates(
			{ page: { date: published, inputPath: './a.md' }, dateModified: override },
			gitHit // would supply a different date; the override must beat it
		);
		expect(dateModified).toEqual(override);
	});

	it('falls to the git date when no front-matter override is set', () => {
		const { dateModified } = resolveDates(
			{ page: { date: published, inputPath: './a.md' } },
			gitHit
		);
		expect(dateModified.toISOString()).toBe('2026-05-30T12:00:00.000Z');
	});

	it('floors dateModified to page.date when git has no record', () => {
		const { dateModified } = resolveDates(
			{ page: { date: published, inputPath: './a.md' } },
			gitMiss
		);
		expect(dateModified).toEqual(published);
	});

	it('does not consult git when the page has no inputPath', () => {
		let called = false;
		const spy = () => {
			called = true;
			return '2099-01-01T00:00:00.000Z';
		};
		const { dateModified } = resolveDates({ page: { date: published } }, spy);
		expect(called).toBe(false);
		expect(dateModified).toEqual(published);
	});

	it('ignores an unparseable front-matter dateModified and falls through', () => {
		const { dateModified } = resolveDates(
			{ page: { date: published, inputPath: './a.md' }, dateModified: 'not a date' },
			gitHit
		);
		expect(dateModified.toISOString()).toBe('2026-05-30T12:00:00.000Z');
	});

	it('returns undefined dates when nothing resolves', () => {
		const { datePublished, dateModified } = resolveDates({ page: {} }, gitMiss);
		expect(datePublished).toBeUndefined();
		expect(dateModified).toBeUndefined();
	});

	it('survives a missing page entirely', () => {
		expect(() => resolveDates({}, gitMiss)).not.toThrow();
		const { datePublished, dateModified } = resolveDates({}, gitMiss);
		expect(datePublished).toBeUndefined();
		expect(dateModified).toBeUndefined();
	});
});
