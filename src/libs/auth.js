/**
 * @file Defines authorization-related functions.
 * @module auth
 */

var config      = require(__dirname + '/requireConfig.js');
var crypto      = require('crypto');
var bcrypt      = require('bcrypt');
var fs          = require('fs');
var mail        = require(__dirname + '/mail.js');
var MongoClient = require('mongodb').MongoClient;

// Systematically export all objects per name
var exports = [
    "confirm",
	"login",
	"register",
    "safeCompare",
];

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
 * @param {string} hash - Encrypted password
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
 * @param {string} user - User that's trying to log in
 * @param {string} password - Unencrypted password
 * @param {comparePasswordCallback}
 */

/**
 * Callback after the password is compared
 * @callback comparePasswordCallback
 * 
 * @param {Boolean|string} response - True if successful, false if passwords do not match, string if another error occurs
 */

function comparePassword(user, password, callback) {
	
    MongoClient.connect(config.mongodbURI, function(err, db) {
        if(!err) {

            var userdata = db.collection('users');
            userdata.find({user: user}).next(function(err, doc) {
				
				db.close();
                if(!err) {
					if(doc !== null) {
						var hash = doc['password'];
						
						bcrypt.compare(password, hash, function(err, res) {
							if(!err) {
								callback(res);
							} else {
								callback('There was an error comparing your password with the database!');
							}
						});
						
					} else {
						callback('Username doesn\'t exist!');
					}
                } else {
					callback('There was an error querying the database');
                }
            });
        } else {
			callback('There was an error connecting to the database');
		}
    });
    
}

/**
 * Always use protection- against timing attacks, kids!
 * @function safeCompare
 * @param a - Raw string (This is what the user inputs)
 * @param b - Comparison string (This is the string WE have)
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
};

/**
 * Confirms a user's account if hash matches
 * @function confirm
 * 
 * @param {string} user - Username
 * @param [string] hash- Hashed password from the database
 * @param {confirmCallback}
 */

/**
 * Callback after the account has is confirmed
 * @callback confirmCallback
 * 
 * @param {Boolean|string} response - True if successful, string if an error occured
 */

function confirm(user, hash, callback) {
	MongoClient.connect(config.mongodbURI, function(err, db) {
		if(!err) {
			
            // Query Hash
            MongoClient.connect(config.mongodbURI, function(err, db) {
                
                var userdata = db.collection('users');
                userdata.find({user: user}).next(function(err, doc) {
                    
                    if(doc !== null) {
                        var dbHash = doc['confirmationHash'];
                        if(safeCompare(hash, dbHash)) {
                            userdata.update({user: user.toLowerCase()}, {$set: {confirmed: true}}, function() {
                                callback(true);
                            });
                        } else {
                            callback('Invalid hash!');
                        }
                    } else {
                        callback('Invalid username!');
                    }
                });
            });
            
		} else {
			callback('There was an error connecting to the database');
		}
	});
}

/**
 * Validates a user's credentials.
 * @function login
 * 
 * @param {string} user - Username
 * @param {string} password - Plaintext password
 * @param {loginCallback}
 */

/**
 * Callback after a user is logged in
 * @callback loginCallback
 * 
 * @param {Boolean|string} True if successful, string if error occured
 */

function login(user, password, callback) {
    comparePassword(user, password, function(response) {
		if(response === true) {
			callback(true);
		} else {
            callback(response);
        }
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
 * @param {registerCallback}
 */

/**
 * Callback after a user is registered
 * @callback registerCallback
 * 
 * @param {Boolean|string} True if successful, string if error occured
 */

function register(user, callback) {
    
    // Checks that all required parameters are there
    
    var required = [
        user.user,
        user.password,
        user.firstName,
        user.lastName,
        user.gradYear,
    ];
    
    var dataSet = required.every(elem => typeof elem !== undefined && elem !== '');
    
    if(dataSet) {
		
		// Upsert user into the database
		MongoClient.connect(config.mongodbURI, function(err, db) {
			if(!err) {
				
				var userdata = db.collection('users');
				
				userdata.find({user: user.user}).toArray().then(function(results) {
					
					if(results.length === 0 || !results[0]['confirmed']) {
                        
                        // Generate confirmation email hash
                        crypto.randomBytes(16, function(err, buf) {
                            if(!err) {
                                
                                var hash = buf.toString('hex');
                                
                                // Hash Password
                                hashPassword(user.password, function(err, hashedPassword) {
                                    if(!err) {

                                        var newUser =
                                            {
                                                user             : user.user.toLowerCase(),
                                                password         : hashedPassword,
                                                firstName        : user.firstName,
                                                lastName         : user.lastName,
                                                gradYear         : user.gradYear,
                                                confirmed        : false,
                                                confirmationHash : hash,
                                            }

                                        userdata.update({user: newUser.user}, newUser, {upsert: true}, function(err, data) {

                                            db.close();
                                            if(!err) {

                                                var email = newUser.user + '@micds.org';
                                                
                                                var emailReplace =
                                                    {
                                                        firstName   : newUser.firstName,
                                                        lastName    : newUser.lastName,
                                                        confirmLink : 'https://mymicds.net/confirm/' + newUser.user + '/' + hash,
                                                    }
                                                
                                                mail.sendHTML(email, 'Confirm your Account', __dirname + '/../html/messages/register.html', emailReplace, function(response) {
                                                    if(response === true) {
                                                        callback(true);

                                                    } else {
                                                        callback('There was an error sending the confirmation email!');
                                                    }
                                                });

                                            } else {
                                                callback('There was a problem inserting the account into the database!');
                                            }
                                        });

                                    } else {
                                        db.close();
                                        callback('Something went wrong when we tried to encrypt your password!');
                                    }
                                });
                            } else {
                                callback('Couldn\'t generate a confirmation hash!');
                            }
                        });
                        
					} else {
						db.close();
						callback('User has already registered an account!');
					}
				});
				
			} else {
				db.close();
				callback('Can\'t connect to database!');
			}
		});
		
    } else {
        callback('Not all data is filled out!');
    }
}

exports.forEach(function(element) {
	module.exports[element] = eval(element);
});