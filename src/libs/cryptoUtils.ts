'use strict';

/**
 * @file Defines some general cryptography and authorization functions
 * @module cryptoUtils
 */
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const { promisify } = require('util');

/**
 * Hashes a given password
 * @function hashPassword
 *
 * @param {string} password - Password to be hashed
 * @param {hashPasswordCallback} callback - Callback
 */

/**
 * Callback after the password is hashed
 * @callback hashPasswordCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {string} hash - Encrypted password. Null if error.
 */

async function hashPassword(password) {
	try {
		return await promisify(bcrypt.hash)(password, 10);
	} catch (e) {
		throw new Error('There was a problem hashing the password!');
	}
}

/**
 * Always use protection (against timing attacks), kids!
 * @function safeCompare
 *
 * @param {string} a - Raw string (This is what the user inputs)
 * @param {string} b - Comparison string (This is the string WE have)
 *
 * @returns {Boolean} res- True if strings match, false if strings do not match or are invalid strings
 */

function safeCompare(a, b) {

	if (typeof a !== 'string' || typeof b !== 'string') {
		return false;
	}

	let mismatch = (a.length === b.length ? 0 : 1);
	if (mismatch) {
		b = a;
	}

	// NOTE: I don't think this can be converted to an ES6 for..of, so I'm keeping it as is.
	for (let i = 0; i < a.length; ++i) {
		const ac = a.charCodeAt(i);
		const bc = b.charCodeAt(i);
		mismatch |= (ac ^ bc);
	}

	return (mismatch === 0);
}

/**
 * Encrypt a string in SHA-256
 * @function shaHash
 *
 * @param {string} string - String to be encrypted
 * @param {shaHashCallback} [callback] - Optional Callback
 *
 * @returns {string}
 */

function shaHash(str) {
	return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Safely compares a plaintext and a sha hash to see if they are the same
 * @function safeCompareSHA
 *
 * @param {string} str - Plaintext string
 * @param {string} hash - SHA-256 hash
 */

function safeCompareSHA(str, hash) {
	const hashedStr = shaHash(str);
	return safeCompare(hashedStr, hash);
}

module.exports.hashPassword   = hashPassword;
module.exports.safeCompare    = safeCompare;
module.exports.shaHash        = shaHash;
module.exports.safeCompareSHA = safeCompareSHA;
