/**
 * Test whether a value is a string.
 * @param {*} object - Value to test.
 * @returns {boolean}
 */
export default function isStringFilter(object) {
	return typeof object === 'string';
}
