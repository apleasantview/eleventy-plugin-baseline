import { describe, expect, it } from 'vitest';
import { registerPageContext } from '../register.js';

/**
 * Stand-in for Eleventy's computed-data discovery proxy, faithful to the one
 * rule that matters: a read is recorded only when the value is neither an
 * array nor a plain object (`ComputedDataProxy.js:72`). A read of a nested
 * object hands back another proxy and records nothing.
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

function register() {
	let computed;
	const config = {
		addGlobalData(key, value) {
			if (key === 'eleventyComputed._pageContext') computed = value();
		}
	};

	registerPageContext(config, {
		state: { settings: { url: 'https://www.example.com/' }, options: {} },
		runtime: { slugIndex: { register() {}, get: () => undefined } },
		scopedLog: () => ({ info() {}, warn() {} })
	});

	return computed;
}

/**
 * What discovery sees: no `outputFileExtension` yet, so the function takes its
 * early return. Anything read before that return is the whole dependency set.
 */
function discover(data = { seo: {}, page: {} }) {
	const reads = new Set();
	register()(discoveryProxy(data, reads));
	return reads;
}

describe('page-context registration, as Eleventy discovers it', () => {
	// Without these, Eleventy records nothing, forms no dependency edge and
	// schedules `_pageContext` before the keys it reads, so a site computing
	// any of them loses it with no warning.
	it('declares the author fields it resolves', () => {
		const reads = discover();

		for (const key of ['title', 'description', 'excerpt', 'slug', 'type', 'canonical', 'noindex']) {
			expect(reads).toContain(key);
		}
	});

	// The trap: a read of `seo` on its own hands back another proxy and
	// registers nothing, so shortening these to their parent undoes the fix.
	it('declares the same fields under the seo namespace', () => {
		const reads = discover();

		expect(reads).toContain('seo.title');
		expect(reads).toContain('seo.description');
		expect(reads).toContain('seo.noindex');
	});

	it('still returns null for a page that is not html', () => {
		expect(register()({ page: { outputFileExtension: 'xml' } })).toBeNull();
	});

	it('still returns null for an internal template', () => {
		expect(register()({ _internal: true, page: { outputFileExtension: 'html' } })).toBeNull();
	});
});
