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
 * @param {string} hash - Encrypted password
 */

function hashPassword(password, callback) {
    bcrypt.hash(password, 10, function(err, hash) {
        callback(err, hash);
    });
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

/**
 * Callback after it hashes a string in SHA-256
 * @callback shaHashCallback
 *
 * @param {string} hash - Hashed string
 */

function shaHash(string, callback) {
    var sha = crypto.createHash('sha256');
    sha.update(string);
    var hash = sha.digest('hex');

    if(callback && typeof(callback) === 'function') {
        callback(hash);
    }
    return hash;
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

module.exports.hashPassword = hashPassword;
module.exports.shaHash      = shaHash;
module.exports.safeCompare  = safeCompare;
