const crypto = require("crypto");

/**
 * Generates a unique custom ID with a prefix
 * @param {string} prefix - The prefix for the ID (e.g., 'USR', 'STR')
 * @param {number} length - The length of the random part (default 6)
 * @returns {string} - The generated ID (e.g., 'USR-A1B2C3')
 */
const generateCustomId = (prefix, length = 6) => {
    const chars = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789"; // Removed O and 0 to avoid confusion
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${result}`;
};

module.exports = generateCustomId;
