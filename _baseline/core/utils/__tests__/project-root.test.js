import { describe, it, expect, afterEach, vi } from 'vitest';
import path from 'node:path';
import { projectRoot, toProjectDir } from '../project-root.js';

const atCwd = (cwd) => vi.spyOn(process, 'cwd').mockReturnValue(cwd);
const root = path.resolve('/projects');

describe('projectRoot', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	// The ordinary case: the input's parent is the working directory, so this
	// returns what a bare relative path would have resolved to anyway.
	it('is the working directory when the input sits directly in it', () => {
		atCwd(root);

		expect(projectRoot('./src/')).toBe(root);
	});

	// The case the anchor exists for. Building two sites from one directory,
	// each one's cache belongs beside its own input.
	it('follows the input when the build runs from a parent directory', () => {
		atCwd(root);

		expect(projectRoot('./site-a/src/')).toBe(path.join(root, 'site-a'));
		expect(projectRoot('./site-b/src/')).toBe(path.join(root, 'site-b'));
	});

	// Taking the parent literally would write the cache outside the project.
	it('stays in the working directory when the input is the project itself', () => {
		atCwd(root);

		expect(projectRoot('.')).toBe(root);
		expect(projectRoot('./')).toBe(root);
	});

	it('takes an absent input as the project itself', () => {
		atCwd(root);

		expect(projectRoot(undefined)).toBe(root);
		expect(projectRoot('')).toBe(root);
	});

	// The scenario the anchor exists for, and the one the first version got
	// wrong. A host process builds several projects without changing directory,
	// so the input is absolute and nowhere near the cwd. Rejecting a parent
	// outside the cwd sent both projects back to the shared one.
	it('follows an absolute input outside the working directory', () => {
		atCwd(path.resolve('/apps/editor'));

		expect(projectRoot(path.resolve('/projects/site-a/src'))).toBe(path.resolve('/projects/site-a'));
		expect(projectRoot(path.resolve('/projects/site-b/src'))).toBe(path.resolve('/projects/site-b'));
	});

	it('accepts the shapes a directory value arrives in', () => {
		atCwd(root);

		expect(projectRoot('src')).toBe(root);
		expect(projectRoot('src/')).toBe(root);
		expect(projectRoot('./src')).toBe(root);
	});
});

// Values land in `_baseline.paths` beside Eleventy's own, which are all
// dot-prefixed and forward-slashed. An absolute one would put the machine's
// filesystem into a template.
describe('toProjectDir', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('dot-prefixes a path inside the build', () => {
		atCwd(root);

		expect(toProjectDir(path.join(root, '.cache'))).toBe('./.cache/');
	});

	it('keeps a path outside the build relative to it', () => {
		atCwd(path.join(root, 'site-a'));

		expect(toProjectDir(path.join(root, 'cache'))).toBe('../cache/');
	});

	// The cwd itself has no relative name, and an empty string is not a path.
	it('names the working directory', () => {
		atCwd(root);

		expect(toProjectDir(root)).toBe('./');
	});
});
