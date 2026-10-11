/**
 * Dates substrate
 *
 * `resolveDates` is the one source for a page's dates. Every date Baseline
 * emits comes through here, so no consumer re-derives the chain or reformats.
 */

import { gitCreated, gitModified } from './git-date.js';

export { gitCreated, gitModified, gitAvailability } from './git-date.js';
export { classify, resolveDates, DEFAULT_SOURCES } from './resolve.js';

/** The git sources, in the shape `resolveDates` reads them. */
export const gitSources = { created: gitCreated, modified: gitModified };
