/**
 * Prefix for the cascade key Baseline writes when it splits a page into parts
 * on a content marker. Shared so the producer and the slug index agree on one
 * spelling; a template paginating its own collection never matches it.
 */
export const SEGMENT_DATA_KEY = '_segments';

/** Alias each part is exposed under, so a body can read `part.index`. */
export const SEGMENT_ALIAS = 'part';

/** Where a template reads the part navigation it renders itself. */
export const PAGEBREAK_KEY = '_pagebreak';

/** The computed registration for it, in `addGlobalData` form. */
export const PAGEBREAK_COMPUTED_KEY = `eleventyComputed.${PAGEBREAK_KEY}`;
