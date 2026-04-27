/**
 * State isolation kernel (registry)
 *
 * Per-config scopes that hold caches, named values, and listener dedup sets.
 * Every store and sub-registry in the substrate borrows a scope here; no
 * feature data lives directly inside.
 *
 * Architecture layer:
 *   registry
 *
 * System role:
 *   Underpins virtual-dir, content-map store, translation-map store, and the
 *   page-context registry. The seam between eleventyConfig and any long-lived
 *   runtime state Baseline carries.
 *
 * Lifecycle:
 *   build-time     → scopes created on demand
 *   cascade-time   → values populated by store writers
 *   transform-time → values read by transform-time consumers
 *
 * Why this exists:
 *   Eleventy has no first-class place to hang per-config singletons. A
 *   WeakMap keyed by eleventyConfig keeps state isolated across reloads and
 *   parallel builds without leaks, and gives every consumer a stable slot.
 *
 * Scope:
 *   Owns scope creation, listener dedup, and identity-keyed memoisation.
 *   Does not own any feature data; only the containers feature code lives in.
 *
 * Data flow:
 *   eleventyConfig → scope → { cache, values, listeners } → consumer
 */

const roots = new WeakMap();

/**
 * Get or create the per-eleventyConfig root that holds all named scopes.
 */
function getRoot(eleventyConfig) {
	let root = roots.get(eleventyConfig);
	if (!root) {
		root = new Map();
		roots.set(eleventyConfig, root);
	}
	return root;
}

/**
 * Get or create a named scope bound to an Eleventy config instance.
 *
 * A scope is a per-config bag of state: a cache (for identity-keyed
 * memoisation), a values map (for named entries), and a listeners set
 * (for deduping event hookups).
 *
 * @param {import('@11ty/eleventy').UserConfig} eleventyConfig
 * @param {string} name - Scope identifier (e.g. 'page-context', 'content-store').
 * @returns {{cache: WeakMap, values: Map, listeners: Set<string>}}
 */
export function getScope(eleventyConfig, name) {
	const root = getRoot(eleventyConfig);

	if (!root.has(name)) {
		root.set(name, {
			cache: new WeakMap(),
			values: new Map(),
			listeners: new Set()
		});
	}

	return root.get(name);
}

/**
 * Attach an Eleventy event listener once per (event, key) pair within a scope.
 *
 * @param {import('@11ty/eleventy').UserConfig} eleventyConfig
 * @param {string} scopeName
 * @param {string} eventName - Eleventy event name (e.g. 'eleventy.contentMap').
 * @param {string} listenerKey - Stable identifier for dedup.
 * @param {(scope: object, payload: any) => void} handler
 */
export function addScopeListener(eleventyConfig, scopeName, eventName, listenerKey, handler) {
	const scope = getScope(eleventyConfig, scopeName);
	const dedupKey = `${eventName}::${listenerKey}`;

	if (scope.listeners.has(dedupKey)) return;
	scope.listeners.add(dedupKey);

	eleventyConfig.on(eventName, (payload) => handler(scope, payload));
}

/**
 * Memoise a value in the scope's cache by object identity.
 */
export function memoize(scope, key, factory) {
	if (scope.cache.has(key)) {
		return scope.cache.get(key);
	}
	const value = factory(key);
	scope.cache.set(key, value);
	return value;
}

export function setEntry(scope, name, value) {
	scope.values.set(name, value);
}

export function getEntry(scope, name) {
	return scope.values.get(name);
}
