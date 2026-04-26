import * as z from 'zod';

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
	languages: z.record(z.string(), z.looseObject({})).optional(),
	head: z
		.object({
			link: z.array(z.looseObject({})).optional(),
			script: z.array(z.looseObject({})).optional(),
			meta: z.array(z.looseObject({})).optional(),
			style: z.array(z.looseObject({})).optional()
		})
		.optional()
});
