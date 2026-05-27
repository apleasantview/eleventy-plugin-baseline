import { z } from 'zod';

// Structural shape of the resolved `seo` namespace. Permissive on values;
// strict only where a missing/wrong shape would break a downstream consumer.
export const seoSchema = z
	.object({
		title: z.string().optional(),
		description: z.string().optional(),
		url: z.string().optional(),
		image: z.unknown().optional(),
		locale: z.string().optional(),
		openGraph: z.record(z.unknown()).optional(),
		twitter: z.record(z.unknown()).optional(),
		schema: z
			.object({
				graph: z.array(z.unknown()).optional()
			})
			.passthrough()
			.optional()
	})
	.passthrough();
