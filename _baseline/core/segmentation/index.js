import { SEGMENT_DATA_KEY, SEGMENT_ALIAS, PAGEBREAK_COMPUTED_KEY } from './constants.js';
import { segment } from './marker.js';
import { isSegmentable, createPartPermalink } from './permalink.js';
import { partEntries, buildPagebreak } from './nav.js';

/**
 * Why this page cannot be split, if it cannot.
 *
 * Each case is a page Baseline declines rather than one it handles badly: two
 * pagination configs cannot share a template, a computed permalink resolves
 * after ours and would collide the parts on one URL, and a page never written
 * has nothing to split.
 *
 * @param {any} data
 * @returns {string | undefined}
 */
function refusal(data) {
	if (data.pagination) return 'it carries its own pagination';
	if (data.eleventyComputed?.permalink) return 'it sets permalink through eleventyComputed';
	if (!isSegmentable(data.permalink)) return 'it is never written to disk';
	return undefined;
}

/**
 * Segmentation (runtime substrate)
 *
 * Splits a page carrying `<!--pagebreak-->` markers into one Eleventy page per
 * part, with no pagination boilerplate in the author's front matter.
 *
 * Architecture layer:
 *   runtime substrate
 *
 * System role:
 *   The only writer of `_segments`, which the slug index reads back to tell one
 *   file fanned into parts from two pages colliding on a slug, and `_pagebreak`,
 *   which a template reads to render its own part navigation.
 *
 * Lifecycle:
 *   cascade-time → scan source, write pagination and permalink, return the
 *                  bodies as guarded template source
 *
 * Why this exists:
 *   `pagination.data` cannot name an `eleventyComputed` key, so a page cannot
 *   fan itself out from something it computes. A preprocessor is the one hook
 *   that runs before Eleventy resolves pagination.
 *
 * Scope:
 *   Owns the marker scan, the part URLs, and the pagination it writes.
 *   Owns no markup and no slug identity: the layout renders the navigation, and
 *   every part keeps the page's own slug so a wikilink lands on part one.
 *
 * Data flow:
 *   raw source → parts → _segments + pagination + permalink → Eleventy
 *   pagination → one page per part → _pagebreak
 *
 * @param {import('@11ty/eleventy').UserConfig} eleventyConfig
 * @param {Object} [context]
 * @param {ReturnType<import('../logging/index.js').createLogger>} [context.log]
 */
export function registerSegmentation(eleventyConfig, { log } = {}) {
	// Registered at config time, the same route as `_node`. Writing
	// eleventyComputed from a preprocessor replaces the directory's own and
	// empties the global keys.
	eleventyConfig.addGlobalData(PAGEBREAK_COMPUTED_KEY, () => (data) => {
		const entries = data?.[SEGMENT_DATA_KEY];
		if (!Array.isArray(entries) || entries.length === 0) return undefined;

		return buildPagebreak(entries, data.pagination?.hrefs, data[SEGMENT_ALIAS]?.index ?? 0);
	});

	// A host preprocessor of the same name wins, as with drafts.
	if (eleventyConfig.preprocessors?.pagebreak) return;

	eleventyConfig.addPreprocessor('pagebreak', 'md', (data, content) => {
		const parts = segment(content);
		if (!parts) return;

		const where = data.page?.inputPath ?? 'a page';
		const refused = refusal(data);
		if (refused) {
			log?.warn(`${where} has a pagebreak marker, but ${refused}. Leaving it alone.`);
			return;
		}

		// Identity and naming only: the bodies ride the template source, not the
		// cascade. `_pagebreak` assembles these into what a template renders.
		data[SEGMENT_DATA_KEY] = partEntries(parts).map((entry, index) => ({ index, ...entry }));
		data.pagination = { data: SEGMENT_DATA_KEY, size: 1, alias: SEGMENT_ALIAS };
		data.permalink = createPartPermalink(data.permalink, SEGMENT_ALIAS);

		log?.info(`${where} split into ${parts.length} parts`);

		// Bodies are emitted as template *source* behind a guard, so one branch
		// survives Nunjucks and the body stays a template. Handed back as data it
		// would be autoescaped and `{% raw %}` would never run.
		return parts
			.map(({ body }, index) => `{% if ${SEGMENT_ALIAS}.index == ${index} %}\n${body}\n{% endif %}`)
			.join('\n');
	});
}
