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
 * Debug surface. Exposes Eleventy and Baseline runtime state to templates so
 * developers can inspect data shape, scope contents, and lifecycle output
 * without leaving the page.
 *
 * Architecture layer:
 *   module
 *
 * System role:
 *   Read-only window into the runtime substrate. Pulls snapshots from the
 *   page-context registry and content-map store via the module context;
 *   does not write back.
 *
 * Lifecycle:
 *   build-time   → register Nunjucks globals, debug filters, and the
 *                  optional virtual debug page
 *   cascade-time → eleventyComputed `_snapshot` resolves contentMap and
 *                  pageContext on each page
 *
 * Why this exists:
 *   Render-time inspection of cascade state has no built-in surface.
 *   Centralising globals and filters under a debug-only module keeps the
 *   inspection vocabulary stable and out of feature modules.
 *
 * Scope:
 *   Owns the `_runtime` and `_ctx` Nunjucks globals, computed `_snapshot`,
 *   debug filters (`_inspect`, `_json`, `_keys`), and the optional virtual
 *   page at /navigator-core.html.
 *   Does not own the data it surfaces (page-context registry, content-map
 *   store).
 *
 * Data flow:
 *   snapshots (contentMap, pageContext) + this.ctx → globals + computed
 *   `_snapshot` + virtual page → developer
 *
 * Note: `_snapshot.contentMap` is null on the navigator template itself
 * because it renders before `eleventy.contentMap` fires. Read `_snapshot`
 * from any ordinary page for a populated contentMap.
 *
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * @param {Object} moduleContext
 * @param {Object} moduleContext.state - Resolved plugin state.
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
