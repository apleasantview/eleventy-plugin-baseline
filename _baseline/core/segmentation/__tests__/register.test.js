import { describe, it, expect } from 'vitest';
import { registerSegmentation } from '../index.js';
import { SEGMENT_DATA_KEY, SEGMENT_ALIAS } from '../constants.js';

const SPLIT = 'One.\n\n<!--pagebreak-->\n\nTwo.\n';

// Enough of a UserConfig to capture the preprocessor and the computed, then
// call either directly.
function rig() {
	const warnings = [];
	let preprocessor;
	let computed;
	const eleventyConfig = {
		preprocessors: {},
		addPreprocessor(_name, _exts, fn) {
			preprocessor = fn;
		},
		addGlobalData(_key, fn) {
			computed = fn();
		}
	};
	registerSegmentation(eleventyConfig, {
		log: { warn: (msg) => warnings.push(msg), info: () => {} }
	});
	return {
		run: (data, content = SPLIT) => preprocessor(data, content),
		pagebreak: (data) => computed(data),
		warnings
	};
}

const page = (extra = {}) => ({ page: { inputPath: './src/story.md', filePathStem: '/story' }, ...extra });

describe('registerSegmentation', () => {
	it('paginates the page and hands back guarded template source', () => {
		const { run } = rig();
		const data = page();
		const out = run(data);

		expect(data[SEGMENT_DATA_KEY]).toEqual([
			{ index: 0, label: '1', anchor: undefined },
			{ index: 1, label: '2', anchor: undefined }
		]);
		expect(data.pagination).toEqual({ data: SEGMENT_DATA_KEY, size: 1, alias: SEGMENT_ALIAS });
		expect(out).toContain('{% if part.index == 0 %}');
		expect(out).toContain('{% if part.index == 1 %}');
	});

	it('leaves a page with no marker completely alone', () => {
		const { run } = rig();
		const data = page();
		expect(run(data, 'Just prose.\n')).toBeUndefined();
		expect(data.pagination).toBeUndefined();
		expect(data.permalink).toBeUndefined();
	});

	it('numbers parts under the page default when nothing set a permalink', () => {
		const { run } = rig();
		const data = page();
		run(data);

		expect(data.permalink({ ...data, [SEGMENT_ALIAS]: { index: 0 } })).toBe('/story/');
		expect(data.permalink({ ...data, [SEGMENT_ALIAS]: { index: 1 } })).toBe('/story/2/');
	});

	it('numbers parts under an authored permalink function', () => {
		const { run } = rig();
		const data = page({ permalink: (d) => `/custom/${d.page.filePathStem.slice(1)}/` });
		run(data);

		expect(data.permalink({ ...data, [SEGMENT_ALIAS]: { index: 1 } })).toBe('/custom/story/2/');
	});

	// The guards. Each one declines the page rather than producing something
	// subtly wrong, and says why.
	it('declines a page that already paginates', () => {
		const { run, warnings } = rig();
		const data = page({ pagination: { data: 'collections.all', size: 1 } });

		expect(run(data)).toBeUndefined();
		expect(data[SEGMENT_DATA_KEY]).toBeUndefined();
		expect(warnings[0]).toMatch(/its own pagination/);
	});

	// Writing our own permalink to the computed layer is not an option: a
	// page-level eleventyComputed replaces the directory's rather than merging,
	// and carrying the old one across re-resolves global keys registered as
	// functions returning functions, which empties them. Found 2026-08-24 by a
	// docs-site page losing every head link and its whole breadcrumb.
	it('declines a page whose permalink comes from eleventyComputed', () => {
		const { run, warnings } = rig();
		const data = page({ eleventyComputed: { permalink: () => '/x/' } });

		expect(run(data)).toBeUndefined();
		expect(data[SEGMENT_DATA_KEY]).toBeUndefined();
		expect(data.eleventyComputed).toEqual({ permalink: expect.any(Function) });
		expect(warnings[0]).toMatch(/eleventyComputed/);
	});

	it('declines a page that is never written to disk', () => {
		const { run, warnings } = rig();
		const data = page({ permalink: false });

		expect(run(data)).toBeUndefined();
		expect(warnings[0]).toMatch(/never written to disk/);
	});

	it('leaves a host preprocessor of the same name in place', () => {
		const eleventyConfig = {
			preprocessors: { pagebreak: () => {} },
			addGlobalData: () => {},
			addPreprocessor: () => expect.fail('should not register')
		};
		expect(() => registerSegmentation(eleventyConfig, {})).not.toThrow();
	});

	// Baseline emits no navigation markup. It hands the pieces to the template,
	// the way `page.translations` does, and the layout renders them.
	describe('the _pagebreak computed', () => {
		it('is undefined on a page that was never split', () => {
			const { pagebreak } = rig();

			expect(pagebreak(page())).toBeUndefined();
			expect(pagebreak({ ...page(), [SEGMENT_DATA_KEY]: [] })).toBeUndefined();
		});

		it('assembles the parts, their urls and the neighbours', () => {
			const { run, pagebreak } = rig();
			const data = page();
			run(data);

			const out = pagebreak({
				...data,
				pagination: { ...data.pagination, hrefs: ['/story/', '/story/2/'] },
				[SEGMENT_ALIAS]: { index: 1 }
			});

			expect(out.number).toBe(2);
			expect(out.total).toBe(2);
			expect(out.previous.url).toBe('/story/');
			expect(out.next).toBeUndefined();
			expect(out.parts[1].current).toBe(true);
		});
	});
});
