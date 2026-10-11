/**
 * Dates substrate
 *
 * The `date` global (formatting), the git commit lookups, and `resolveDates`:
 * the one source for a page's dates, so no consumer re-derives the chain.
 */

import { gitCreated, gitModified } from './git-date.js';

export { registerDateGlobal } from './date-global.js';
export { gitCreated, gitModified, gitIsShallow } from './git-date.js';
export { classify, resolveDates, DEFAULT_SOURCES } from './resolve.js';

/** The git sources, in the shape `resolveDates` reads them. */
export const gitSources = { created: gitCreated, modified: gitModified };
