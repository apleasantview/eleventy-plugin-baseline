/**
 * Prefix for the cascade key Baseline writes when it splits a page into parts
 * on a content marker. Shared so the producer and the slug index agree on one
 * spelling; a template paginating its own collection never matches it.
 */
export const SEGMENT_DATA_KEY = '_segments';
