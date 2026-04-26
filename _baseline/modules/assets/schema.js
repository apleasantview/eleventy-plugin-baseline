import * as z from 'zod';

// Structural schema for assets-core plugin options. Permissive on unknown
// keys (esbuild accepts many options we don't touch); strict on the keys the
// plugin itself reads.

export const esbuildOptionsSchema = z.looseObject({
	minify: z.boolean().optional(),
	target: z.string().optional()
});

export const optionsSchema = z.looseObject({
	verbose: z.boolean().optional(),
	esbuild: esbuildOptionsSchema.optional()
});
