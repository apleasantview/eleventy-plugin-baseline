import { createRequire } from 'node:module';

import { describe, it, expect } from 'vitest';

import baseline, { config } from '@apleasantview/eleventy-plugin-baseline';

const NAME = '@apleasantview/eleventy-plugin-baseline';
const require = createRequire(import.meta.url);

// The only suite that imports by package name instead of by path, so it is the
// only one that goes through the `exports` map a consumer actually hits.
describe('the published entry point', () => {
	it('resolves by package name and gives the plugin and its config', () => {
		expect(typeof baseline).toBe('function');
		expect(config).toMatchObject({ dir: { input: 'src', output: 'dist' } });
	});

	it('exports the package.json subpath', () => {
		expect(require(`${NAME}/package.json`).name).toBe(NAME);
	});

	// Internals stay unreachable from outside, which is what lets the barrels
	// change shape without it being a breaking change. Matched on the message
	// because Vitest rewraps the rejection and drops Node's error code.
	it('refuses a deep import', async () => {
		await expect(import(`${NAME}/core/dates/resolve.js`)).rejects.toThrow(/is not exported/);
	});
});
