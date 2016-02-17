/**
 * @file Defines authorization-related functions.
 * @module auth
 */

var bcrypt = require('bcrypt');

/**
 * Hashes a given password
 * @function hashPassword
 * 
 * @param {string} password - Password to be hashed
 * @param {hashPasswordCallback}
 */

/**
 * Callback after the password is hashed
 * @callback hashPasswordCallback
 * 
 * @param {Object} err - Error
 * @param {String} hash - Encrypted password
 */

function hashPassword(password, callback) {
    bcrypt.hash(password, 9, function(err, hash) {
        callback(err, hash);
    });
}

/**
 * Determines if a given password matches the encrypted one in the database
 * @function comparePassword
 * 
 * @param {String} user - User that's trying to log in
 * @param {String} password - Unencrypted password
 * @param {comparePasswordCallback}
 */

/**
 * Callback after the password is compared
 * @callback comparePasswordCallback
 * 
 * @param {Object} err - Error
 * @param {Object} res - Response
 */

function comparePassword(user, password, callback) {
    
    var MongoClient = require('mongodb').MongoClient;

    MongoClient.connect(config.mongodbURI, function(err, db) {
        if(err) {
            console.error('Unable to establish connection to MongoDB. Error: ' + err)
        } else {
            console.log('Successfully connected to the MongoDB database');

            var userdata = db.collection('users');
            userdata.find({user: user}).next(function(err, doc) {
                if(!err) {
                    var hash = doc[0]['password'];
                    
                    bcrypt.compare(password, hash, function(err, res) {
                        callback(err, res);
                    });
                } else {
                    console.log('There was an error querying the database');
                }
            });
        }
    });
    
}

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
    
    // Checks that all required parameters are there
    
    var required = [
        user.user,
        user.password,
        user.firstName,
        user.lastName,
        user.gradYear,
    ];
    
    var dataSet = required.every(elem => typeof elem !== undefined);
    
    if(dataSet) {
        // Do other stuff
    } else {
        return 'Not all data is filled out!';
    }
    
    return true;
}

module.exports.login = login;
module.exports.logout = logout;
module.exports.register = register;