import { inspect as utilInspect } from "node:util";

// Adapted from pdehaan - https://github.com/pdehaan/eleventy-plugin-debug
const debugOptions = Object.assign({
  space: 0
});

function inspect(obj, options = {}) {
  return utilInspect(obj, options);
}

function json(obj, space = debugOptions.space) {
  return JSON.stringify(obj, null, space);
}

function keys(obj) {
  return Object.keys(obj).sort();
}

export default { inspect, json, keys };
