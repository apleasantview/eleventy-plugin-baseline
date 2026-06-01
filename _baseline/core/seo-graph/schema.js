import { z } from 'zod';

// Structural shape of the resolved `seo` namespace. Permissive on values;
// strict only where a missing/wrong shape would break a downstream consumer.
export const seoSchema = z
	.object({
		title: z.string().optional(),
		description: z.string().optional(),
		url: z.string().optional(),
		ogImage: z.unknown().optional(),
		locale: z.string().optional(),
		openGraph: z.record(z.unknown()).optional(),
		twitter: z.record(z.unknown()).optional(),
		// The assembled JSON-LD @graph. Authored identity lives at
		// `data.schema`; the resolved graph lives here. No `seo.schema` path.
		graph: z.array(z.unknown()).optional()
	})
	.passthrough();
