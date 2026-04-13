import { inspect as utilInspect } from 'node:util';

// Adapted from pdehaan - https://github.com/pdehaan/eleventy-plugin-debug
const debugOptions = Object.assign({
	space: 0
});

/**
 * Pretty-print an object using Node's util.inspect.
 * @param {*} obj - Value to inspect.
 * @param {Object} [options={}] - Options forwarded to util.inspect.
 * @returns {string}
 */
function inspect(obj, options = {}) {
	return utilInspect(obj, options);
}

/**
 * Serialize an object to JSON.
 * @param {*} obj - Value to serialize.
 * @param {number} [space] - Indentation level (default 0, compact).
 * @returns {string}
 */
function json(obj, space = debugOptions.space) {
	return JSON.stringify(obj, null, space);
}

/**
 * Return an object's own keys, sorted alphabetically.
 * @param {Object} obj
 * @returns {string[]}
 */
function keys(obj) {
	return Object.keys(obj).sort();
}

export default { inspect, json, keys };
