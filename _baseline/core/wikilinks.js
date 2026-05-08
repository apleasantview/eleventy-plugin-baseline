import { slugify } from './utils/slugify.js';

/**
 * Wikilinks (runtime substrate)
 *
 * MediaWiki-style inline link syntax for body markdown. Recognises
 * [[slug]], [[slug#anchor]], [[slug:lang]], [[slug|alias]], and any
 * combination. Resolves slugs against the slug index and, when a lang
 * suffix is given, hops to the requested translation. Misses render as
 * the original literal text.
 *
 * Architecture layer:
 *   runtime substrate
 *
 * System role:
 *   Markdown-it plugin registered by the composition root via
 *   amendLibrary('md', ...). Reads the slug index, page-context registry,
 *   and translation-map store; writes nothing back.
 *
 * Lifecycle:
 *   transform-time → parses [[...]] in body markdown and emits link or
 *                    text tokens
 *
 * Why this exists:
 *   Markdown-it has no wiki-link syntax. Eleventy resolves all
 *   eleventyComputed values before any body renders, so the slug index
 *   and translation map are complete by the time this rule fires.
 *   Resolution is deterministic without a two-pass build.
 *
 * Scope:
 *   Owns syntax parsing, slug-to-href resolution, the lang hop, and link
 *   rendering with class/lang/hreflang attributes.
 *   Does not own slug derivation (page-context), index population, or the
 *   translation-map shape (multilang module).
 *
 * Data flow:
 *   markdown-it inline state → slug index + page context + translation map → link tokens
 *
 * @param {import('markdown-it').default} md
 * @param {Object} deps
 * @param {{getBySlug: (slug: string) => string | undefined}} deps.slugIndex
 * @param {{getByKey: (url: string) => any}} deps.pageContextRegistry
 * @param {{get: () => Record<string, Record<string, {url: string, title?: string}>> | null}} [deps.translationMapStore]
 */
export function wikilinks(md, { slugIndex, pageContextRegistry, translationMapStore } = {}) {
	if (!slugIndex || !pageContextRegistry) {
		throw new Error('wikilinks plugin requires { slugIndex, pageContextRegistry }');
	}

	function parse(inner) {
		// [[target|alias]]
		const pipeIdx = inner.indexOf('|');
		const target = pipeIdx === -1 ? inner : inner.slice(0, pipeIdx);
		const alias = pipeIdx === -1 ? null : inner.slice(pipeIdx + 1).trim() || null;

		// [[slug-or-langed#anchor]]
		const hashIdx = target.indexOf('#');
		const slugAndLang = hashIdx === -1 ? target : target.slice(0, hashIdx);
		const rawAnchor = hashIdx === -1 ? null : target.slice(hashIdx + 1).trim() || null;
		const anchor = rawAnchor ? slugify(rawAnchor) : null;

		// [[slug:lang]]
		const colonIdx = slugAndLang.indexOf(':');
		const rawSlug = colonIdx === -1 ? slugAndLang : slugAndLang.slice(0, colonIdx);
		const rawLang = colonIdx === -1 ? null : slugAndLang.slice(colonIdx + 1).trim() || null;

		return { rawSlug: rawSlug.trim(), rawLang, anchor, alias };
	}

	function resolve({ rawSlug, rawLang, anchor, alias }) {
		const slug = slugify(rawSlug);
		if (!slug) return null;

		const url = slugIndex.getBySlug(slug);
		if (!url) return null;

		const ctx = pageContextRegistry.getByKey(url);
		const defaultTitle = ctx?.entry?.title ?? rawSlug;

		const withAnchor = (u) => (anchor ? `${u}#${anchor}` : u);

		if (!rawLang) {
			return {
				href: withAnchor(url),
				label: alias ?? defaultTitle,
				lang: null
			};
		}

		const lang = rawLang.toLowerCase();
		const translationKey = ctx?.page?.locale?.translationKey;
		if (!translationKey) return null;

		const map = translationMapStore?.get?.();
		const entry = map?.[translationKey]?.[lang];
		if (!entry) return null;

		return {
			href: withAnchor(entry.url),
			label: alias ?? entry.title ?? defaultTitle,
			lang
		};
	}

	function tokenize(state, silent) {
		const start = state.pos;
		const src = state.src;

		if (src.charCodeAt(start) !== 0x5b /* [ */) return false;
		if (src.charCodeAt(start + 1) !== 0x5b) return false;

		const end = src.indexOf(']]', start + 2);
		if (end === -1) return false;

		const inner = src.slice(start + 2, end);
		// Reject nested brackets to keep the rule unambiguous.
		if (inner.includes('[') || inner.includes(']')) return false;

		if (silent) {
			state.pos = end + 2;
			return true;
		}

		const literal = src.slice(start, end + 2);
		const parsed = parse(inner);
		const result = resolve(parsed);

		if (!result) {
			const t = state.push('text', '', 0);
			t.content = literal;
		} else {
			const open = state.push('link_open', 'a', 1);
			const attrs = [
				['href', result.href],
				['class', 'wikilink']
			];
			if (result.lang) {
				attrs.push(['lang', result.lang]);
				attrs.push(['hreflang', result.lang]);
			}
			open.attrs = attrs;
			const text = state.push('text', '', 0);
			text.content = result.label;
			state.push('link_close', 'a', -1);
		}

		state.pos = end + 2;
		return true;
	}

	md.inline.ruler.before('link', 'wikilink', tokenize);
}
