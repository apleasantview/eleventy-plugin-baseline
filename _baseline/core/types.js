/**
 * Baseline shared typedefs.
 *
 * Extracted from the composition root so file-level headers stay scannable.
 * No runtime exports; this file exists for IDE and JSDoc tooling only.
 */

/**
 * @typedef {Object} BaselineSettings
 * Site identity and SEO configuration.
 *
 * @property {string} [title]
 * @property {string} [tagline]
 * @property {string} [url]
 * @property {boolean} [noindex]
 * @property {string} [defaultLanguage]
 * @property {Record<string, unknown>} [languages]
 * @property {Object} [head]
 */

/**
 * @typedef {Object} BaselineOptions
 * Runtime feature flags and behavior configuration.
 *
 * @property {boolean} [verbose]
 * Enables structured debug logging across modules.
 *
 * @property {boolean|Object} [navigator]
 * Controls navigator tooling.
 * If not explicitly set, it may be inferred from environment (e.g. dev mode).
 *
 * @property {boolean} [enableSitemapTemplate]
 * Enables sitemap generation module (default: true).
 *
 * @property {boolean} [multilingual]
 * Forces multilingual mode. If omitted, it is inferred from settings.
 *
 * @property {Object} [assetsESBuild]
 * ESBuild pipeline configuration for assets system.
 */

/**
 * @typedef {Object} BaselineState
 * Fully resolved internal plugin state.
 *
 * @property {Object} settings
 * @property {Object} options
 */

/**
 * @typedef {Object} BaselineContext
 * Shared module boundary contract.
 *
 * This context is the only supported interface between:
 * - Eleventy configuration runtime
 * - baseline core
 * - feature modules
 *
 * @property {BaselineState} state
 * @property {Object} runtime
 * @property {Object} runtime.contentMap
 * @property {Object} runtime.site
 */

export {};
