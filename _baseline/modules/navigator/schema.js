import * as z from 'zod';

// Structural schema for the `options.navigator` slice. Accepts boolean
// shorthand or object form; permissive on unknown keys, typed on the keys
// the module reads. Non-throwing at the call site.

export const optionsSchema = z.union([
	z.boolean(),
	z.looseObject({
		template: z.boolean().optional(),
		inspectorDepth: z.number().int().min(0).optional()
	})
]).optional();
