/**
 * Safe integer parser that handles NaN cases
 *
 * parseInt('abc') returns NaN, which can break Math.max/min chains
 * This function ensures a valid integer is always returned
 *
 * @param {*} value - Value to parse
 * @param {number} defaultValue - Default value if parsing fails
 * @returns {number} - Parsed integer or default value
 *
 * @example
 * safeParseInt('123', 1) // => 123
 * safeParseInt('abc', 1) // => 1
 * safeParseInt(null, 10) // => 10
 * safeParseInt(undefined, 5) // => 5
 */
export const safeParseInt = (value, defaultValue = 1) => {
    const parsed = parseInt(value, 10);

    return Number.isNaN(parsed) ? defaultValue : parsed;
};

export default safeParseInt;

