import * as z from 'zod';

export const configSchema = z.object({
	dir: z.object({
		input: z.string().min(1),
		output: z.string().min(1),
		data: z.string().min(1),
		includes: z.string().min(1),
		assets: z.string().min(1)
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
