/**
 * Return the first value that is neither undefined nor null.
 * @param {...*} values
 * @returns {*}
 */
const pick = (...values) => values.find((v) => v !== undefined && v !== null);
export default pick;
