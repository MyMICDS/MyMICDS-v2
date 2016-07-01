'use strict';

/**
 * @file Defines some general cryptography and authorization functions
 * @module cryptoUtils
 */

var bcrypt = require('bcrypt');
var crypto = require('crypto');

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

function hashPassword(password, callback) {
	bcrypt.hash(password, 10, function(err, hash) {
		if(err) {
			callback(new Error('There was a problem hashing the password!'), null);
			return;
		}
		callback(null, hash);
	});
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

	if(typeof a !== 'string' || typeof b !== 'string') {
		return false;
	}

	var mismatch = (a.length === b.length ? 0 : 1);
	if(mismatch) {
		b = a;
	}

	for(var i = 0; i < a.length; ++i) {
		var ac = a.charCodeAt(i);
		var bc = b.charCodeAt(i);
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
	var hashedStr = shaHash(str);
	return safeCompare(hashedStr, hash);
}

module.exports.hashPassword   = hashPassword;
module.exports.safeCompare    = safeCompare;
module.exports.shaHash        = shaHash;
module.exports.safeCompareSHA = safeCompareSHA;
