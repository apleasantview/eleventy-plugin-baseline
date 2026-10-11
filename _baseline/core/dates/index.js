/**
 * Dates substrate
 *
 * One home for date concerns: the Nunjucks `date` global (formatting), the
 * git-backed commit lookups, and `resolveDates` — the single source for a
 * page's published/modified dates that the seo-graph substrate and any other
 * consumer read from instead of re-deriving the chain.
 */

import { gitCreated, gitModified } from './git-date.js';

export { registerDateGlobal } from './date-global.js';
export { gitCreated, gitModified, maxGitModified, gitIsShallow } from './git-date.js';
export { classify, resolveDates, DEFAULT_SOURCES } from './resolve.js';

/** The git sources, in the shape `resolveDates` reads them. */
export const gitSources = { created: gitCreated, modified: gitModified };
