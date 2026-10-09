import { describe, expect, it } from 'vitest';
import { registerSeoGraph } from '../register.js';

/**
 * Stand-in for Eleventy's computed-data discovery proxy, faithful to the one
 * rule that matters: a read is recorded only when the value is neither an
 * array nor a plain object (`ComputedDataProxy.js:72`). A read of a nested
 * object hands back another proxy and records nothing, which is why reaching
 * for `data.schema` alone registers no dependency at all.
 *
 * It also mirrors Eleventy's own side effect of defaulting every declared
 * computed key to `''` before discovery, which is what makes a key like
 * `schema.pieces` a leaf even on a page that never declared it.
 */
function discoveryProxy(data, reads, parentKey = '') {
	const isContainer = (value) => Array.isArray(value) || (typeof value === 'object' && value !== null);

	return new Proxy(
		{},
		{
			get: (_target, key) => {
				if (typeof key !== 'string') return undefined;
				const path = parentKey ? `${parentKey}.${key}` : key;
				const value = data?.[key];
				if (isContainer(value)) return discoveryProxy(value, reads, path);
				reads.add(path);
				return value;
			}
		}
	);
}

function register(eleventyConfig = {}) {
	let computed;
	const config = {
		...eleventyConfig,
		addGlobalData(key, value) {
			if (key === 'eleventyComputed._seoGraph') computed = value();
		}
	};

	registerSeoGraph(config, {
		state: { settings: { url: 'https://www.example.com/' }, options: {} },
		runtime: {},
		scopedLog: () => ({ info() {}, warn() {} })
	});

	return computed;
}

/**
 * What discovery sees: no `outputFileExtension` yet, so the function takes its
 * early return. Anything read before that return is the whole dependency set.
 */
function discover(data = { schema: { pieces: '' }, seo: {}, page: {} }) {
	const reads = new Set();
	register()(discoveryProxy(data, reads));
	return reads;
}

describe('seo-graph registration, as Eleventy discovers it', () => {
	// Without this, Eleventy records nothing, forms no dependency edge and
	// schedules `_seoGraph` before the keys it reads. A computed
	// `schema.pieces` then never reaches the graph, which it did not for
	// anyone between 2026-06 and 2026-10 on every page without pagination.
	it('declares schema.pieces as a dependency', () => {
		expect(discover()).toContain('schema.pieces');
	});

	// The trap: a read of `seo` on its own hands back another proxy and
	// registers nothing, so shortening either path to its parent undoes it.
	it('declares both image paths the adapter picks from', () => {
		const reads = discover();

		expect(reads).toContain('seo.ogImage');
		expect(reads).toContain('ogImage');
	});

	it('still returns early for a page that is not html', () => {
		expect(register()({ page: { outputFileExtension: 'xml' } })).toBeNull();
	});

	it('leaves the existing handle on an internal template alone', () => {
		const handle = { url: '/already/' };

		expect(register()({ _internal: true, _seoGraph: handle })).toBe(handle);
	});
});
