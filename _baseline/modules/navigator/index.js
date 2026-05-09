import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import debug from './utils/debug.js';
import { optionsSchema } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Navigator (module)
 *
 * Two roles, one module: the public read surface for plugin-produced
 * cross-page data (the content graph and its enriched backlinks), and the
 * debug surface for inspecting Eleventy and Baseline runtime state.
 *
 * Architecture layer:
 *   module
 *
 * System role:
 *   Read-only window over the runtime substrate. Surfaces the content graph
 *   for templates that need cross-page reads, and snapshots from the
 *   page-context registry and content-map store for debugging. Writes
 *   nothing back.
 *
 * Lifecycle:
 *   build-time   → register `_navigator` (graph, backlinks), debug globals,
 *                  filters, and the optional virtual debug page
 *   cascade-time → eleventyComputed `_snapshot` resolves contentMap and
 *                  pageContext on each page
 *
 * Why this exists:
 *   Templates need an addressable cross-page surface for graph reads, and
 *   render-time inspection of cascade state has no built-in equivalent.
 *   One module owns both vocabularies so feature modules stay narrow.
 *
 * Scope:
 *   Owns the `_navigator` global (`{ graph, backlinks }`, the public read
 *   surface), the debug globals `_runtime` and `_ctx`, computed `_snapshot`,
 *   debug filters (`_inspect`, `_json`, `_keys`), and the optional virtual
 *   page at /navigator-core.html.
 *   Does not own the data it surfaces (content graph, page-context registry,
 *   content-map store).
 *
 * Data flow:
 *   runtime.contentGraph + snapshots + this.ctx → `_navigator` + debug
 *   globals + computed `_snapshot` + virtual page → templates and
 *   developers
 *
 * Note: `_snapshot.contentMap` is null on the navigator template itself
 * because it renders before `eleventy.contentMap` fires. Read `_snapshot`
 * from any ordinary page for a populated contentMap.
 *
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * @param {Object} moduleContext
 * @param {Object} moduleContext.state - Resolved plugin state.
 * @param {Object} moduleContext.runtime - Lazy access layer; reads contentGraph.
 * @param {Object} moduleContext.snapshots - Thunks: { contentMap, pageContext }.
 */
export function navigatorCore(eleventyConfig, moduleContext) {
	const { state, runtime, snapshots, log, env } = moduleContext;
	const { settings, options } = state;

	// Structural-only options check: log on mismatch, do not throw.
	const parsed = optionsSchema.safeParse(options.navigator);
	if (!parsed.success) {
		for (const issue of parsed.error.issues) {
			log.info('options:', `${issue.path.join('.')} — ${issue.message}`);
		}
	}

	// Boolean shorthand activates the virtual page; object form lets users tune.
	const navigatorOpts = options.navigator && typeof options.navigator === 'object' ? options.navigator : {};
	const renderTemplate = navigatorOpts.template ?? (typeof options.navigator === 'boolean' ? options.navigator : env.mode === 'development');
	const inspectorDepth = navigatorOpts.inspectorDepth ?? 4;

	eleventyConfig.addGlobalData('eleventyComputed._snapshot', () => {
		return () => ({
			contentMap: snapshots.contentMap(),
			pageContext: snapshots.pageContext()
		});
	});

	// Public read surface for plugin-produced cross-page data. Templates can
	// paginate over `_navigator.backlinks` or read `_navigator.graph` directly.
	eleventyConfig.addGlobalData('_navigator', () => ({
		graph: runtime.contentGraph?.pages ?? {},
		backlinks: runtime.contentGraph?.backlinks ?? {}
	}));

	/**
	 * Nunjucks Global: _runtime
	 *
	 * Exposes internal Nunjucks runtime state:
	 * - env  → environment instance
	 * - ctx  → current render context
	 * - globals → registered global values
	 */
	eleventyConfig.addNunjucksGlobal('_runtime', function () {
		return {
			env: this.env,
			ctx: this.ctx,
			globals: this.env?.globals
		};
	});

	/**
	 * Nunjucks Global: _ctx
	 *
	 * Direct reference to the template execution context.
	 * Useful for debugging data shape at render time.
	 */
	eleventyConfig.addNunjucksGlobal('_ctx', function () {
		return this.ctx;
	});

	/**
	 * Virtual Debug Template
	 *
	 * Registers a synthetic Eleventy page that dumps runtime context.
	 * This is only enabled when explicitly configured via options.
	 */
	if (renderTemplate) {
		const templatePath = path.join(__dirname, './templates/navigator-core.html');
		const virtualTemplateContent = fs.readFileSync(templatePath, 'utf-8');

		eleventyConfig.addTemplate('navigator-core.html', virtualTemplateContent, {
			permalink: '/navigator-core.html',
			title: 'Navigator Core',
			description: 'Eleventy + Baseline internals',
			layout: null,
			eleventyExcludeFromCollections: true,
			_internal: false,

			// Debug control surface
			inspectorDepth
		});

		log.info('Navigator template registered at /navigator-core.html');
	}

	/**
	 * Debug Filters
	 *
	 * Lightweight helpers for inspecting values in templates.
	 * These are intentionally prefixed to avoid collisions.
	 */
	eleventyConfig.addFilter('_inspect', debug.inspect);
	eleventyConfig.addFilter('_json', debug.json);
	eleventyConfig.addFilter('_keys', debug.keys);
}
