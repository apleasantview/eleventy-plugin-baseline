/**
 * Helper function to add trailing slash to a path
 * @param {string} path
 * @returns {string}
 */
export function addTrailingSlash(path) {
	if (path.slice(-1) === '/') {
		return path;
	}
	return path + '/';
}
