// Based on posthtml-head-elements (MIT License).
// Original: https://github.com/posthtml/posthtml-head-elements
// Adapted for Baseline head-core.

import { createRequire } from 'node:module';
import { createLogger } from '../../../core/logging.js';

const require = createRequire(import.meta.url);

function nonString(type, attrsArr) {
	return attrsArr.map(function (attrs) {
		return { tag: type, attrs: attrs };
	});
}

function nonArray(type, content) {
	return { tag: type, content: [content] };
}

function findElmType(type, objectData, log) {
	const elementType = {
		meta: function () {
			if (Array.isArray(objectData)) {
				return nonString(type, objectData);
			} else {
				log.warn('invalid <meta> element syntax');
			}
		},
		title: function () {
			if (typeof objectData === 'string') {
				return nonArray('title', objectData);
			} else {
				log.warn('invalid <title> element syntax');
			}
		},
		link: function () {
			if (Array.isArray(objectData)) {
				return nonString(type, objectData);
			} else {
				log.warn('invalid <link> element syntax');
			}
		},
		linkCanonical: function () {
			if (Array.isArray(objectData)) {
				return nonString('link', objectData);
			} else {
				log.warn('invalid canonical <link> element syntax');
			}
		},
		script: function () {
			if (Array.isArray(objectData)) {
				return objectData.map(function (entry) {
					const { content, ...attrs } = entry || {};
					return content !== undefined ? { tag: 'script', attrs, content: [content] } : { tag: 'script', attrs };
				});
			} else {
				log.warn('invalid <script> element syntax');
			}
		},
		style: function () {
			if (Array.isArray(objectData)) {
				return objectData.map(function (entry) {
					const { content, ...attrs } = entry || {};
					return content !== undefined ? { tag: 'style', attrs, content: [content] } : { tag: 'style', attrs };
				});
			} else {
				log.warn('invalid <style> element syntax');
			}
		},
		base: function () {
			if (Array.isArray(objectData)) {
				return nonString(type, objectData);
			} else {
				log.warn('invalid <base> element syntax');
			}
		},
		default: function () {
			log.warn('unrecognised head element type');
		}
	};

	if (type.indexOf('_') !== -1) {
		type = type.slice(0, type.indexOf('_'));
	}

	return elementType[type]() || elementType['default']();
}

function buildNewTree(headElements, EOL, log) {
	const newHeadElements = [];

	Object.keys(headElements).forEach(function (value) {
		newHeadElements.push(findElmType(value, headElements[value], log));
	});

	function cnct(arr) {
		return Array.prototype.concat.apply([], arr);
	}

	return cnct(
		cnct(newHeadElements).map(function (elem) {
			return [elem, EOL];
		})
	);
}

export default function (options) {
	options = options || {};
	options.headElementsTag = options.headElementsTag || 'posthtml-head-elements';
	// Fall back to a silent-info logger so this driver works standalone.
	const log = options.logger || createLogger('head-core');

	if (!options.headElements) {
		log.warn('missing headElements option (provide the object or a path to a JSON file)');
	}
	const jsonOne = typeof options.headElements !== 'string' ? options.headElements : require(options.headElements);

	return function posthtmlHeadElements(tree) {
		tree.match({ tag: options.headElementsTag }, function () {
			return {
				tag: false, // delete this node, safe content
				content: buildNewTree(jsonOne, options.EOL || '\n', log)
			};
		});

		return tree;
	};
}
