import * as z from 'zod';

/**
 * Schemas (runtime substrate)
 *
 * Zod schemas for the two user-facing inputs Baseline validates: the
 * directory `config` export and the `settings` argument. Structural only.
 * Value-level preferences stay permissive.
 *
 * Architecture layer:
 *   runtime substrate
 *
 * System role:
 *   Validation seam at the public boundary. The composition root parses
 *   `settings` non-fatally at init; the directory `config` is checked in
 *   the test suite, not at runtime.
 *
 * Lifecycle:
 *   build-time → composition root calls `settingsSchema.safeParse(settings)`
 *                and logs structural mismatches under `info`
 *
 * Why this exists:
 *   Eleventy accepts almost anything users pass through `addPlugin`. A
 *   structural gate catches typos and shape drift early without forcing
 *   a hard failure on imperfect input.
 *
 * Scope:
 *   Owns the structural shape of `settings` and `config`. Does not own
 *   defaults, value semantics, or required-field policy; those live in
 *   the composition root and individual modules.
 *
 * Data flow:
 *   user input → safeParse → issues logged or accepted
 */

export const configSchema = z.object({
	dir: z.object({
		input: z.string().min(1),
		output: z.string().min(1),
		data: z.string().min(1),
		includes: z.string().min(1),
		assets: z.string().min(1),
		public: z.string().min(1)
	}),
	htmlTemplateEngine: z.string().min(1),
	markdownTemplateEngine: z.string().min(1),
	templateFormats: z
		.array(z.string().min(1))
		.min(1)
		.refine((templateFormats) => templateFormats.includes('njk'), {
			error: 'Baseline requires njk in templateFormats'
		})
});

export const settingsSchema = z.object({
	title: z.string().optional(),
	tagline: z.string().optional(),
	url: z.string().optional(),
	noindex: z.boolean().optional(),
	defaultLanguage: z.string().optional(),
	languages: z.union([z.record(z.string(), z.looseObject({})), z.array(z.string().min(1))]).optional(),
	head: z
		.object({
			link: z.array(z.looseObject({})).optional(),
			script: z.array(z.looseObject({})).optional(),
			meta: z.array(z.looseObject({})).optional(),
			style: z.array(z.looseObject({})).optional()
		})
		.optional()
});
