import { DateTime } from 'luxon';

/**
 * Register Nunjucks global "date" with helper methods.
 * Currently exposes date.toUTCISO(value) -> UTC ISO string without milliseconds.
 *
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 */
export function registerDateGlobal(eleventyConfig) {
	eleventyConfig.addNunjucksGlobal('date', {
		toUTCISO(value) {
			if (!value) return '';
			const jsDate = value instanceof Date ? value : new Date(value);
			if (Number.isNaN(jsDate.getTime())) return '';
			return DateTime.fromJSDate(jsDate).toUTC().toISO({ suppressMilliseconds: true });
		}
	});
}
