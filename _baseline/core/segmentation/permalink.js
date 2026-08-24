/**
 * Can a page carrying this permalink be segmented?
 *
 * A function is the common case, not the exception, so it is resolved per part
 * and whatever it returns is part one's URL. Only `permalink: false` is refused:
 * a page never written has nothing to split.
 *
 * @param {unknown} permalink - The value already sitting on the cascade.
 * @returns {boolean}
 */
export function isSegmentable(permalink) {
	if (permalink === undefined) return true;
	return typeof permalink === 'string' || typeof permalink === 'function';
}

/**
 * Derive part one's URL the way Eleventy would have, when nobody set one.
 *
 * `filePathStem` keeps the directories. A stem ending in `/index` loses that
 * segment, matching Eleventy's own treatment of an index file.
 *
 * @param {string} [filePathStem] - e.g. `/blog/story` or `/blog/index`.
 * @returns {string} A path with a trailing slash.
 */
export function baseFromFilePathStem(filePathStem) {
	const stem = filePathStem || '';
	const trimmed = stem.endsWith('/index') ? stem.slice(0, -'index'.length) : `${stem}/`;
	return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/**
 * URL for one part. Part one keeps the page's own URL; the rest are numbered
 * subdirectories of it, the shape WordPress has used for split posts for
 * twenty years. A file-shaped base loses its extension before numbering, since
 * `/story.html/2/` would be nonsense.
 *
 * @param {string} base - Part one's URL, as the site resolved it.
 * @param {number} index - Zero-based part number.
 * @returns {string}
 */
export function numberUnder(base, index) {
	if (index === 0) return base;
	const dir = base.endsWith('/') ? base : `${base.replace(/\.[^./]*$/, '')}/`;
	return `${dir}${index + 1}/`;
}

/**
 * The permalink each part resolves through, numbering under whatever the site
 * asked for. Declared with `function` so `this.slugify` reaches an authored
 * function expecting it.
 *
 * @param {string | Function} [authored] - The permalink already on the cascade.
 * @param {string} alias - Pagination alias carrying the part index.
 * @returns {Function}
 */
export function createPartPermalink(authored, alias) {
	return function (pageData) {
		const base = typeof authored === 'function' ? authored.call(this, pageData) : authored;
		if (base === false) return false;

		// Absence means "no opinion, use the default", not "no URL".
		const resolved = base ?? baseFromFilePathStem(pageData?.page?.filePathStem);

		return numberUnder(resolved, pageData?.[alias]?.index ?? 0);
	};
}
