/**
 * Safe markdown-it plugin registration
 *
 * Calls md.use(plugin, options) only when no rule with the given name is
 * already registered on the core, block, or inline ruler. Lets Baseline
 * coexist with user configs that loaded the same plugin themselves.
 *
 * Architecture layer:
 *   utility
 *
 * System role:
 *   Helper used by the composition root when amending the markdown-it
 *   instance.
 *
 * Lifecycle:
 *   transform-time (config load)
 *
 * Why this exists:
 *   markdown-it has no built-in dedup. Calling .use() twice on a plugin
 *   that pushes a parser rule runs it twice per render. Eleventy's
 *   amendLibrary callbacks compose with whatever the user already wired,
 *   so a guard at the seam keeps both sides intact.
 *
 * @param {import('markdown-it').default} md
 * @param {string} ruleName - canonical rule name the plugin registers
 * @param {(md: any, options?: any) => void} plugin
 * @param {any} [options]
 * @param {{ info?: (msg: string) => void }} [log]
 */
export function safeUse(md, ruleName, plugin, options, log) {
	const rulers = [md.core?.ruler, md.block?.ruler, md.inline?.ruler];
	const installed = rulers.some((r) =>
		r?.__rules__?.some((rule) => rule.name === ruleName)
	);

	if (installed) {
		log?.info?.(`markdown-it rule "${ruleName}" already registered, skipping`);
		return;
	}

	md.use(plugin, options);
}
