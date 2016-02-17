/**
 * @file Defines authorization-related functions.
 * @module auth
 */

var config = require(__dirname + '/requireconfig.js');

var bcrypt = require('bcrypt');
var MongoClient = require('mongodb').MongoClient;

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
    bcrypt.hash(password, 10, function(err, hash) {
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
	
    MongoClient.connect(config.mongodbURI, function(err, db) {
        if(err) {
            console.error('Unable to establish connection to MongoDB. Error: ' + err)
        } else {
            console.log('Successfully connected to the MongoDB database');

            var userdata = db.collection('users');
            userdata.find({user: user}).next(function(err, doc) {
				
				db.close();
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
 * Confirms a user's account if hash matches
 * @function confirm
 * 
 * @param {string} user - Username
 * @returns {Boolean|string} Returns true if confirmation is successful, returns message if an error
 */

function confirm(user, hash) {
	MongoClient.connect(config.mongodbURI, function(err, db) {
		if(!err) {
			/** @todo Query database for hash, update if hash matches */
		} else {
			return 'Can\'t connect to the database!';
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
    comparePassword(user, password, function(err, res) {
		if(!err) {
			if(res) {
				// Login is successful!
			} else {
				// Login failed
			}
		} else {
			/** @todo Implement error if password comparison fails */
		}
	});
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
        return err ? err : true;
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
    
    var dataSet = required.every(elem => typeof elem !== undefined && elem !== null);
    
    if(dataSet) {
		
		// Upsert user into the database
		MongoClient.connect(config.mongodbURI, function(err, db) {
			if(!err) {
				
				var userdata = db.collection('users');
				
				userdata.find({user: user.user}).toArray().then(function(results) {
					
					if(results.length === 0 || !results[0]['confirmed']) {
						// Hash Password
						hashPassword(user.password, function(err, hash) {
							if(!err) {

								userdata.update({user: user.user}, {
									user      : user.user,
									password  : user.password,
									firstName : user.firstName,
									lastName  : user.lastName,
									gradYear  : user.gradYear,
									confirmed : false,
								}, {upsert: true}, function(err, data) {

									db.close();
									if(!err) {
										
										/** @todo Email confirmation */
										
										return true;
									} else {
										return 'There was a problem inserting the account into the database!';
									}
								});

							} else {
								db.close();
								return 'Something went wrong when we tried to encrypt your password!';
							}
						});
					} else {
						db.close();
						return 'User has already registered an account!';
					}
				});
				
			} else {
				db.close();
				return 'Can\'t connect to database!';
			}
		});
		
    } else {
        return 'Not all data is filled out!';
    }
    
    return true;
}

module.exports.login = login;
module.exports.logout = logout;
module.exports.register = register;