import { describe, it, expect } from 'vitest';
import { gitAvailability, gitModified, gitCreated } from '../git-date.js';
import { DEFAULT_SOURCES } from '../resolve.js';

// This suite runs inside the project's own repository, so `ok` is the answer
// here. The other two states are proved against real repositories rather than
// mocks; see the internal changelog for the probe.
describe('gitAvailability', () => {
	it('reports ok in a repository with history', () => {
		expect(gitAvailability()).toBe('ok');
	});

	it('agrees with the lookups: ok means a tracked file resolves', () => {
		expect(gitAvailability()).toBe('ok');
		expect(gitModified('_baseline/index.js')).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		expect(gitCreated('_baseline/index.js')).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it('returns null for a path git has never seen', () => {
		expect(gitModified('_baseline/does-not-exist.js')).toBeNull();
	});
});

// The warning in the composition root is gated on a source list naming git, so
// the default lists have to keep naming it for the default path to warn at all.
describe('the git sources the warning is gated on', () => {
	it('are still in the default modified chain', () => {
		const tokens = [...DEFAULT_SOURCES.datePublished, ...DEFAULT_SOURCES.dateModified];

		expect(tokens.some((token) => token.startsWith(':git-'))).toBe(true);
	});
});
