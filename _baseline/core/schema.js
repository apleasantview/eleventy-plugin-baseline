import * as z from 'zod';

/**
 * Schemas (runtime substrate)
 *
 * Zod schemas for the user-facing inputs the composition root reads: the
 * directory `config` export, the `settings` argument, and the `options` keys
 * core itself acts on. Structural only. Value-level preferences stay
 * permissive.
 *
 * Architecture layer:
 *   runtime substrate
 *
 * System role:
 *   Validation seam at the public boundary. The composition root parses
 *   `settings` and `options` non-fatally at init; the directory `config` is
 *   checked in the test suite, not at runtime.
 *
 * Lifecycle:
 *   build-time → composition root calls `settingsSchema.safeParse(settings)`
 *                and `optionsSchema.safeParse(options)`, logging structural
 *                mismatches as warnings
 *
 * Why this exists:
 *   Eleventy accepts almost anything users pass through `addPlugin`. A
 *   structural gate catches typos and shape drift early without forcing
 *   a hard failure on imperfect input.
 *
 * Scope:
 *   Owns the structural shape of `settings`, `config`, and core's own option
 *   keys. Does not own defaults, value semantics, or required-field policy;
 *   those live in the composition root and individual modules.
 *
 *   **This is not the only schema file, by design.** Whatever reads an option
 *   validates it, so each module owns its own slice next to the code that acts
 *   on it: `modules/head/schema.js` (`options.head`, plus the `settings.head`
 *   and `settings.seo` slices) and `modules/assets/schema.js`
 *   (`options.assets`). `options.media` sits here only because no module owns
 *   media yet, and it moves out the day one does.
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

/**
 * The `options` keys the composition root reads.
 *
 * Loose at the top, because `head` and `assets` are validated by the modules
 * that own them and the legacy aliases still arrive here through the shim.
 * `media.image` is the exception and is strict: unlike the other slices it
 * forwards nothing to a third party, so every key it accepts is a key Baseline
 * reads, and a misspelled one would otherwise do nothing in silence.
 */
export const optionsSchema = z.looseObject({
	verbose: z.boolean().optional(),
	multilingual: z.boolean().optional(),
	sitemap: z.boolean().optional(),
	navigator: z
		.union([
			z.boolean(),
			z.looseObject({
				template: z.boolean().optional(),
				inspectorDepth: z.number().optional()
			})
		])
		.optional(),
	media: z
		.strictObject({
			image: z
				.strictObject({
					widths: z.array(z.union([z.number(), z.literal('auto')])).optional(),
					formats: z.array(z.string().min(1)).optional(),
					sizes: z.string().min(1).optional()
				})
				.optional()
		})
		.optional()
});

export const settingsSchema = z.object({
	title: z.string().optional(),
	tagline: z.string().optional(),
	description: z.string().optional(),
	url: z.string().optional(),
	noindex: z.boolean().optional(),
	defaultLanguage: z.string().optional(),
	defaultLocale: z.string().optional(),
	languages: z
		.unknown()
		.optional()
		.superRefine((value, ctx) => {
			if (value === undefined) return;

			if (Array.isArray(value)) {
				const arrayResult = z.array(z.string().min(1)).safeParse(value);
				if (!arrayResult.success) {
					for (const issue of arrayResult.error.issues) ctx.addIssue(issue);
				}
				return;
			}

			const recordResult = z.record(z.string(), z.looseObject({})).safeParse(value);
			if (!recordResult.success) {
				for (const issue of recordResult.error.issues) ctx.addIssue(issue);
			}
		}),
	head: z
		.object({
			link: z.array(z.looseObject({})).optional(),
			script: z.array(z.looseObject({})).optional(),
			meta: z.array(z.looseObject({})).optional(),
			style: z.array(z.looseObject({})).optional()
		})
		.optional(),
	seo: z.looseObject({}).optional()
});
