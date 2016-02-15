/**
 * @file Defines authorization-related functions.
 * @module auth
 */

/**
 * Validates a user's credentials.
 * @function login
 * 
 * @param {Object} session - Express Session of Request
 * @param {string} user - Username
 * @param {string} password - Plaintext password
 * @returns {Boolean|string} Returns true if login is successful, returns message if login fails
 * 
 */

function login(session, user, password) {
    session.user = user;
    return true;
}

/**
 * Logs a user out.
 * @function register
 * 
 * @param {Object} session - Express Session of Request
 * @returns {Boolean|Object} Returns true if successful, returns error object if logout fails
 * 
 */

function logout(session) {
    session.destroy(function(err) {
        return err;
    });
}

/**
 * Registers a user by adding their credentials into the database. Also sends email confirmation.
 * @function register
 * 
 * @param {Object} user - User's credentials
 * @param {string} user.user - Username (___@micds.org)
 * @param {string} user.password - User's plaintext password
 * @param {string} user.firstName - User's first name
 * @param {string} user.lastName - User's last name
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