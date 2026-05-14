/**
 * Auto heading IDs (runtime substrate)
 *
 * Assigns stable id attributes to every heading that doesn't already have
 * one. Manual ids (from markdown-it-attrs or any upstream plugin) win and
 * seed the dedup map, so auto ids skip over names a manual id has claimed.
 * Duplicate slugs get WordPress-style suffixes: foo, foo-2, foo-3, …
 *
 * Architecture layer:
 *   runtime substrate
 *
 * System role:
 *   Markdown-it plugin registered by the composition root via
 *   amendLibrary('md', ...). Mutates heading_open tokens; reads nothing
 *   from the runtime.
 *
 * Lifecycle:
 *   transform-time → assigns id attrs on heading_open tokens during the
 *                    core parsing phase
 *
 * Why this exists:
 *   The content graph and deep-link consumers all need predictable heading
 *   ids. Doing it inside the markdown engine means the rendered HTML and
 *   the graph's heading record are guaranteed identical, instead of being
 *   "usually equal because the same slugify helper runs on both sides".
 *
 * Scope:
 *   Owns id assignment and dedup. Does not render permalink affordances;
 *   that's a theme concern.
 *
 * @param {import('markdown-it').default} md
 * @param {Object} deps
 * @param {(text: string) => string | undefined} deps.slugify
 */
export function autoHeadingIds(md, { slugify } = {}) {
	if (typeof slugify !== 'function') {
		throw new Error('auto-heading-ids plugin requires { slugify }');
	}

	md.core.ruler.push('baseline_auto_heading_ids', (state) => {
		const tokens = state.tokens;
		const seen = new Set();
		const counts = new Map();

		// Pass 1: seed dedup with manual ids so autos never collide with them.
		for (let i = 0; i < tokens.length; i++) {
			const t = tokens[i];
			if (t.type !== 'heading_open') continue;
			const manual = t.attrGet('id');
			if (manual) seen.add(manual);
		}

		// Pass 2: assign auto ids to headings that lack one.
		for (let i = 0; i < tokens.length; i++) {
			const t = tokens[i];
			if (t.type !== 'heading_open') continue;
			if (t.attrGet('id')) continue;

			// Read from children rather than .content: markdown-it-attrs
			// strips the {.class} from children tokens but leaves the parent
			// inline .content untouched, so slugifying .content would fold
			// the attribute text into the id.
			const inline = tokens[i + 1];
			const text = (inline?.children || [])
				.filter((c) => c.type === 'text' || c.type === 'code_inline' || c.type === 'image')
				.map((c) => (c.type === 'image' ? c.attrGet('alt') || c.content || '' : c.content))
				.join('')
				.trim();
			if (!text) continue;

			const base = slugify(text);
			if (!base) continue;

			let n = counts.get(base) || 0;
			let id;
			do {
				id = n === 0 ? base : `${base}-${n + 1}`;
				n += 1;
			} while (seen.has(id));

			counts.set(base, n);
			seen.add(id);
			t.attrSet('id', id);
		}
	});
}
