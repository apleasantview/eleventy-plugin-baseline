import markdownIt from 'markdown-it';

/**
 * The marker, alone on its own line. Everything between the name and the close
 * is the parameter string, parsed by `parseParams`.
 */
const MARKER = /^<!--\s*pagebreak\b([^>]*?)\s*-->\s*$/;

// A bare instance on purpose. `html: true` is what makes the marker an html_block
// rather than a paragraph.
const scanner = markdownIt({ html: true });

/**
 * Parse a marker's parameters into the link it asks for.
 *
 * The grammar is the wikilinks one: `#` an anchor, `|` the part's name. Without
 * a label the part is numbered instead.
 *
 * @param {string} [raw] - Everything between `pagebreak` and `-->`.
 * @returns {{anchor?: string, label?: string} | undefined}
 */
function parseParams(raw) {
	const params = (raw ?? '').trim();
	if (!params) return undefined;

	const pipe = params.indexOf('|');
	const anchorPart = (pipe === -1 ? params : params.slice(0, pipe)).trim();
	const label = pipe === -1 ? undefined : params.slice(pipe + 1).trim() || undefined;
	const anchor = anchorPart.startsWith('#') ? anchorPart.slice(1) || undefined : undefined;

	return anchor || label ? { anchor, label } : undefined;
}

/**
 * Split raw page source on `<!--pagebreak-->` markers.
 *
 * A token walk, not a line regex: a marker inside a fence, an indented block or
 * inline code never surfaces as an `html_block`, so it is sheltered for free.
 * `{% raw %}` cannot shelter it, being ordinary text at this point.
 *
 * @param {string} content - Raw source, before any template or markdown pass.
 * @returns {Array<{body: string, next?: {anchor?: string, label?: string}}> | null}
 *   Two or more parts, each carrying the parameters of the marker that follows
 *   it, or null when the page carries no usable marker and should be left alone.
 */
export function segment(content) {
	if (!content || !content.includes('pagebreak')) return null;

	const cuts = [];
	for (const token of scanner.parse(content, {})) {
		if (token.type !== 'html_block') continue;
		const match = MARKER.exec(token.content.trim());
		if (!match) continue;
		cuts.push({ start: token.map[0], end: token.map[1], next: parseParams(match[1]) });
	}
	if (cuts.length === 0) return null;

	const lines = content.split('\n');
	const parts = [];
	let cursor = 0;
	for (const cut of cuts) {
		parts.push({ body: lines.slice(cursor, cut.start).join('\n').trim(), next: cut.next });
		cursor = cut.end;
	}
	parts.push({ body: lines.slice(cursor).join('\n').trim() });

	// A marker on the first or last line leaves an empty body either side.
	const kept = parts.filter((part) => part.body);
	return kept.length > 1 ? kept : null;
}
