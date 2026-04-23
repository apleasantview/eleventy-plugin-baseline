/**
 * capo.js adapter for PostHTML AST nodes.
 *
 * Implements the HTMLAdapter interface capo.js v2 uses to compute element
 * weights (src/adapters/adapter.js in @rviscomi/capo.js). Only getWeight is
 * consumed downstream; the rest are shimmed to satisfy the shape.
 *
 * A PostHTML element node looks like `{ tag, attrs, content }` where attrs
 * is either undefined or a plain object. Boolean attributes appear with an
 * empty-string value (`{ async: '' }`) or as `true`.
 */

const hasAttr = (node, name) => {
	if (!node || !node.attrs) return false;
	const key = name.toLowerCase();
	for (const k of Object.keys(node.attrs)) {
		if (k.toLowerCase() === key) return true;
	}
	return false;
};

const getAttr = (node, name) => {
	if (!node || !node.attrs) return null;
	const key = name.toLowerCase();
	for (const k of Object.keys(node.attrs)) {
		if (k.toLowerCase() === key) {
			const v = node.attrs[k];
			return v === true ? '' : v == null ? null : String(v);
		}
	}
	return null;
};

const getText = (node) => {
	if (!node || node.content == null) return '';
	if (typeof node.content === 'string') return node.content;
	if (Array.isArray(node.content)) return node.content.filter((c) => typeof c === 'string').join('');
	return '';
};

export const capoPosthtmlAdapter = {
	isElement(node) {
		return !!(node && typeof node === 'object' && typeof node.tag === 'string');
	},
	getTagName(node) {
		return node && typeof node.tag === 'string' ? node.tag.toLowerCase() : '';
	},
	getAttribute(node, name) {
		return getAttr(node, name);
	},
	hasAttribute(node, name) {
		return hasAttr(node, name);
	},
	getAttributeNames(node) {
		return node && node.attrs ? Object.keys(node.attrs) : [];
	},
	getTextContent(node) {
		return getText(node);
	},
	getChildren() {
		return [];
	},
	getParent() {
		return null;
	},
	getSiblings() {
		return [];
	},
	stringify(node) {
		return node && node.tag ? `<${node.tag}>` : '';
	}
};
