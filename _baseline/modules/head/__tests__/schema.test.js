import { describe, expect, it } from 'vitest';
import { optionsSchema, settingsHeadSchema, settingsSeoSchema, pageSeoSchema } from '../schema.js';

describe('optionsSchema', () => {
	it('accepts an empty object and valid known keys', () => {
		expect(optionsSchema.safeParse({}).success).toBe(true);
		expect(optionsSchema.safeParse({ titleSeparator: ' | ', showGenerator: true }).success).toBe(true);
	});

	it('rejects wrongly-typed known keys', () => {
		expect(optionsSchema.safeParse({ titleSeparator: 5 }).success).toBe(false);
		expect(optionsSchema.safeParse({ showGenerator: 'yes' }).success).toBe(false);
	});

	it('passes unknown keys through', () => {
		const out = optionsSchema.safeParse({ extra: 'kept' });
		expect(out.success).toBe(true);
		expect(out.data.extra).toBe('kept');
	});
});

describe('settingsHeadSchema', () => {
	it('accepts empty and array-of-object slots', () => {
		expect(settingsHeadSchema.safeParse({}).success).toBe(true);
		expect(
			settingsHeadSchema.safeParse({
				link: [{ rel: 'stylesheet', href: '/x.css' }],
				meta: [{ name: 'color-scheme', content: 'light dark' }]
			}).success
		).toBe(true);
	});

	it('rejects a non-array slot', () => {
		expect(settingsHeadSchema.safeParse({ link: { rel: 'stylesheet' } }).success).toBe(false);
	});

	it('passes unknown keys through', () => {
		const out = settingsHeadSchema.safeParse({ base: [{ href: '/' }] });
		expect(out.success).toBe(true);
		expect(out.data.base).toEqual([{ href: '/' }]);
	});
});

describe('settingsSeoSchema', () => {
	it('accepts the docs-site default shape', () => {
		const out = settingsSeoSchema.safeParse({
			preserveQueryParams: false,
			ogImage: null,
			openGraph: { type: 'website' },
			twitter: { card: 'summary_large_image' }
		});
		expect(out.success).toBe(true);
	});

	it('lets ogImage be anything (null, bare path, or object)', () => {
		expect(settingsSeoSchema.safeParse({ ogImage: null }).success).toBe(true);
		expect(settingsSeoSchema.safeParse({ ogImage: '/og.jpg' }).success).toBe(true);
		expect(
			settingsSeoSchema.safeParse({ ogImage: { url: '/og.jpg', width: 1200, height: 630 } }).success
		).toBe(true);
	});

	it('rejects a non-boolean preserveQueryParams', () => {
		expect(settingsSeoSchema.safeParse({ preserveQueryParams: 'true' }).success).toBe(false);
	});

	it('rejects a non-object openGraph', () => {
		expect(settingsSeoSchema.safeParse({ openGraph: 'website' }).success).toBe(false);
	});

	it('passes unknown keys through', () => {
		const out = settingsSeoSchema.safeParse({ keywords: ['a', 'b'] });
		expect(out.success).toBe(true);
		expect(out.data.keywords).toEqual(['a', 'b']);
	});
});

describe('pageSeoSchema', () => {
	it('accepts an empty block and valid scalars', () => {
		expect(pageSeoSchema.safeParse({}).success).toBe(true);
		expect(
			pageSeoSchema.safeParse({ title: 'About', description: 'x', noindex: true, ogType: 'article' }).success
		).toBe(true);
	});

	it('rejects a non-boolean noindex', () => {
		expect(pageSeoSchema.safeParse({ noindex: 'yes' }).success).toBe(false);
	});

	it('rejects a non-string title', () => {
		expect(pageSeoSchema.safeParse({ title: 42 }).success).toBe(false);
	});

	it('passes unknown keys through', () => {
		const out = pageSeoSchema.safeParse({ custom: 1 });
		expect(out.success).toBe(true);
		expect(out.data.custom).toBe(1);
	});
});
