/**
 * @file Defines authorization-related functions.
 * @module auth
 */

/**
 * Validates a user's credentials.
 * @function login
 * 
 * @param {string} user - Username
 * @param {string} password - Plaintext password
 * @returns {Boolean|string} Returns true if login is successful, returns message if login fails
 * 
 */

function login(user, password) {
    return "Invalid password!";
}

/**
 * Logs a user out.
 * @function register
 * 
 * @param {string} user - Username
 * @returns {Boolean|string} Returns true if successful, returns message if logout fails
 * 
 */

function logout(user) {
    return true;
}

/**
 * Registers a user by adding their credentials into the database.
 * @function register
 * 
 * @param {Object} user - User's credentials
 * @param {string} user.user - User's username ___@micds.org
 * @param {string} user.firstName - User's first name
 * @param {string} user.lastName - User's last name
 * @param {string} user.password - User's plaintext password
 * @param {Number} user.gradYear - User's graduation year (Ex. Class of 2019)
 * 
 * @returns {Boolean|string} Returns true if successful, returns message if register fails
 * 
 */

function register(user) {
    return true;
}

module.exports.login = login;
module.exports.logout = logout;
module.exports.register = register;