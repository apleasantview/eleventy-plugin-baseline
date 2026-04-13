// Based on posthtml-head-elements (MIT License).
// Original: https://github.com/posthtml/posthtml-head-elements
// Adapted for Baseline head-core.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function nonString(type, attrsArr) {
	return attrsArr.map(function (attrs) {
		return { tag: type, attrs: attrs };
	});
}

function nonArray(type, content) {
	return { tag: type, content: [content] };
}

function findElmType(type, objectData) {
	const elementType = {
		meta: function () {
			if (Array.isArray(objectData)) {
				return nonString(type, objectData);
			} else {
				console.warn('posthtml-head-elements: Please use the correct syntax for a meta element');
			}
		},
		title: function () {
			if (typeof objectData === 'string') {
				return nonArray('title', objectData);
			} else {
				console.warn('posthtml-head-elements: Please use the correct syntax for a title element');
			}
		},
		link: function () {
			if (Array.isArray(objectData)) {
				return nonString(type, objectData);
			} else {
				console.warn('posthtml-head-elements: Please use the correct syntax for a link element');
			}
		},
		linkCanonical: function () {
			if (Array.isArray(objectData)) {
				return nonString('link', objectData);
			} else {
				console.warn('posthtml-head-elements: Please use the correct syntax for a linkCanonical element');
			}
		},
		script: function () {
			if (Array.isArray(objectData)) {
				return objectData.map(function (entry) {
					const { content, ...attrs } = entry || {};
					return content !== undefined ? { tag: 'script', attrs, content: [content] } : { tag: 'script', attrs };
				});
			} else {
				console.warn('posthtml-head-elements: Please use the correct syntax for a script element');
			}
		},
		style: function () {
			if (Array.isArray(objectData)) {
				return objectData.map(function (entry) {
					const { content, ...attrs } = entry || {};
					return content !== undefined ? { tag: 'style', attrs, content: [content] } : { tag: 'style', attrs };
				});
			} else {
				console.warn('posthtml-head-elements: Please use the correct syntax for a style element');
			}
		},
		base: function () {
			if (Array.isArray(objectData)) {
				return nonString(type, objectData);
			} else {
				console.warn('posthtml-head-elements: Please use the correct syntax for a base element');
			}
		},
		default: function () {
			console.warn('posthtml-head-elements: Please make sure the HTML head type is correct');
		}
	};

	if (type.indexOf('_') !== -1) {
		type = type.slice(0, type.indexOf('_'));
	}

	return elementType[type]() || elementType['default']();
}

function buildNewTree(headElements, EOL) {
	const newHeadElements = [];

	Object.keys(headElements).forEach(function (value) {
		newHeadElements.push(findElmType(value, headElements[value]));
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

	if (!options.headElements) {
		console.warn(
			"posthtml-head-elements: Don't forget to add a link to the JSON file containing the head elements to insert"
		);
	}
	const jsonOne = typeof options.headElements !== 'string' ? options.headElements : require(options.headElements);

	return function posthtmlHeadElements(tree) {
		tree.match({ tag: options.headElementsTag }, function () {
			return {
				tag: false, // delete this node, safe content
				content: buildNewTree(jsonOne, options.EOL || '\n')
			};
		});

		return tree;
	};
}
