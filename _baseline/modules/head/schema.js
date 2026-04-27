import * as z from 'zod';

// Structural schemas for head-core. Permissive on unknown keys, typed on
// keys the driver reads. Non-throwing at the call site — safeParse only.

// `options.head` slice: render-behaviour knobs.
export const optionsSchema = z.looseObject({
	titleSeparator: z.string().optional(),
	showGenerator: z.boolean().optional()
});

// `settings.head` extras slot: additive link/script/meta/style arrays.
export const settingsHeadSchema = z.looseObject({
	link: z.array(z.looseObject({})).optional(),
	script: z.array(z.looseObject({})).optional(),
	meta: z.array(z.looseObject({})).optional(),
	style: z.array(z.looseObject({})).optional()
});

// `settings.seo` site-default SEO scalars, page-overridable.
export const settingsSeoSchema = z.looseObject({
	ogImage: z.string().optional(),
	twitterSite: z.string().optional()
});

// Page-level `seo:` block. Same scalar set as bare front matter, namespaced.
// `seo.foo` wins over bare `foo`.
export const pageSeoSchema = z.looseObject({
	title: z.string().optional(),
	description: z.string().optional(),
	noindex: z.boolean().optional(),
	canonical: z.string().optional(),
	ogTitle: z.string().optional(),
	ogDescription: z.string().optional(),
	ogType: z.string().optional(),
	ogImage: z.string().optional(),
	twitterCard: z.string().optional(),
	twitterSite: z.string().optional(),
	twitterTitle: z.string().optional(),
	twitterDescription: z.string().optional(),
	twitterImage: z.string().optional()
});
