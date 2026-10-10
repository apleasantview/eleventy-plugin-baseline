import * as z from 'zod';

// Structural schema for the `options.assets` slice. Permissive on unknown
// keys (esbuild accepts many options we don't touch); strict on the keys the
// plugin itself reads.

// Entry points sit with their processor, which is the door each tool already
// has here. `esbuild.entryPoints` was accepted and dropped before this.
const entryPointsSchema = z.array(z.string().min(1));

export const esbuildOptionsSchema = z.looseObject({
	minify: z.boolean().optional(),
	target: z.string().optional(),
	entryPoints: entryPointsSchema.optional()
});

export const postcssOptionsSchema = z.looseObject({
	entryPoints: entryPointsSchema.optional()
});

export const optionsSchema = z.looseObject({
	esbuild: esbuildOptionsSchema.optional(),
	postcss: postcssOptionsSchema.optional()
});
