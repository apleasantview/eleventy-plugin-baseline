import { slugify } from './slugify.js';

// Symbols the slugify package's charmap spells out as English words: `<` becomes
// "less", `%` becomes "percent", `&` becomes "and". Sensible for a filename,
// wrong for a heading a reader sees in the address bar, where `<head>` has to
// stay recognisable as `head` rather than becoming `lessheadgreater`.
const SPELLED_OUT_SYMBOLS = /[<>|%&+~*=$^]/g;

// Punctuation that joins two words in an identifier. `strict` deletes these
// outright, which runs the words together (`page.translations` collapses to
// `pagetranslations`). A heading is read, so the boundary has to survive.
const WORD_JOINERS = /[._/\\@:]+/g;

/**
 * Slugify a string into a heading anchor.
 *
 * Same transliteration and hyphenation as {@link slugify}, with two differences
 * that matter only when a human reads the result: symbols are dropped rather
 * than spelled out, and identifier punctuation becomes a word boundary rather
 * than disappearing.
 *
 * Must stay in step with every producer and consumer of a heading id. Three
 * call sites share it: the markdown plugin that assigns the id, the graph
 * extractor's fallback, and the `#anchor` half of a wikilink. If they diverge,
 * links point at anchors that do not exist.
 *
 * @param {string|null|undefined} input
 * @returns {string|undefined}
 */
export function slugifyAnchor(input) {
	if (input == null) return;
	return slugify(String(input).replace(SPELLED_OUT_SYMBOLS, ' ').replace(WORD_JOINERS, ' '));
}
