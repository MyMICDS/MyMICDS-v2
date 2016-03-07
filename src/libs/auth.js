/**
 * @file Defines authorization-related functions.
 * @module auth
 */

var config      = require(__dirname + '/requireConfig.js');
var crypto      = require('crypto');
var cryptoUtils = require(__dirname + '/cryptoUtils.js');
var bcrypt      = require('bcrypt');
var mail        = require(__dirname + '/mail.js');
var MongoClient = require('mongodb').MongoClient;
var utils       = require(__dirname + '/utils.js');

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
 * Confirms a user's account if hash matches
 * @function confirm
 * 
 * @param {string} user - Username
 * @param {string} hash- Hashed password from the database
 * @param {confirmCallback}
 */

/**
 * Callback after the account has is confirmed
 * @callback confirmCallback
 * 
 * @param {Boolean|string} response - True if successful, string if an error occured
 */

function confirm(user, hash, callback) {
	MongoClient.connect(config.mongodbURI, function(connectErr, db) {
		if(!connectErr) {
                
            var userdata = db.collection('users');
            userdata.find({user: user}).next(function(queryErr, doc) {
                
                if(doc !== null) {
                    var dbHash = doc['confirmationHash'];
                    if(cryptoUtils.safeCompare(hash, dbHash)) {
                        userdata.update({user: user.toLowerCase()}, {$set: {confirmed: true}}, function() {
                            callback(true);
                        });
                    } else {
                        callback('Invalid hash!');
                    }
                } else if(queryErr) {
                    callback('There was an error querying the database!');
                } else {
                    callback('Invalid username!');
                }
            });
            
		} else {
			callback('There was an error connecting to the database!');
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
            MongoClient.connect(config.mongodbURI, function(connectErr, db) {
                var userdata = db.collection('users');
                userdata.update({user: user}, {$currentDate: {lastLogin: true}});
            });
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
 * @param {Boolean} user.teacher - True or false, weather the user is a teacher or not
 * 
 * @param {registerCallback}
 */

/**
 * Callback after a user is registered
 * @callback registerCallback
 * 
 * @param {Boolean} success - True if success, false if failure
 * @param {string} message - More detailed response to display to user
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
    
    if(!user.teacher) {
        user.teacher = false;
    } else {
		user.gradYear = null;
	}
    
    if(utils.dataIsSet(required)) {
		
		// Upsert user into the database
		MongoClient.connect(config.mongodbURI, function(dbErr, db) {
			if(!dbErr) {
				var userdata = db.collection('users');
				userdata.find({user: user.user}).toArray(function(queryErr, docs) {
					
                    if(!queryErr) {                        
                        if(docs.length === 0 || !docs[0]['confirmed']) {

                            // Generate confirmation email hash
                            crypto.randomBytes(16, function(err, buf) {
                                if(!err) {

                                    var hash = buf.toString('hex');

                                    // Hash Password
                                    cryptoUtils.hashPassword(user.password, function(hashErr, hashedPassword) {
                                        if(!hashErr) {

                                            var newUser =
                                            {
                                                user      : user.user.toLowerCase(),
                                                password  : hashedPassword,
                                                firstName : user.firstName,
                                                lastName  : user.lastName,
                                                gradYear  : user.gradYear,
                                                teacher   : user.teacher,
                                                confirmed : false,
                                                registered: new Date(),
                                                confirmationHash: hash,
                                            }

                                            userdata.update({user: newUser.user}, newUser, {upsert: true}, function(updateErr, data) {

                                                db.close();
                                                if(!updateErr) {

                                                    var email = newUser.user + '@micds.org';
                                                    var emailReplace =
                                                    {
                                                        firstName  : newUser.firstName,
                                                        lastName   : newUser.lastName,
                                                        confirmLink: 'https://mymicds.net/confirm/' + newUser.user + '/' + hash,
                                                    }

                                                    mail.sendHTML(email, 'Confirm your Account', __dirname + '/../html/messages/register.html', emailReplace, function(response) {
                                                        if(response === true) {
                                                            callback(true, 'Confirmation email sent to ' + email + '!');

                                                        } else {
                                                            callback(false, 'There was an error sending the confirmation email!');
                                                        }
                                                    });

                                                } else {
                                                    callback(false, 'There was a problem inserting the account into the database!');
                                                }
                                            });

                                        } else {
                                            db.close();
                                            callback(false, 'Something went wrong when we tried to encrypt your password!');
                                        }
                                    });
                                } else {
                                    callback(false, 'Couldn\'t generate a confirmation hash!');
                                }
                            });

                        } else {
                            db.close();
                            callback(false, 'User has already registered an account!');
                        }
                    } else {
                        db.close();
                        callback(false, 'There was an error querying the database!');
                    }
				});
				
			} else {
				db.close();
				callback(false, 'Can\'t connect to database!');
			}
		});
		
    } else {
        callback(false, 'Not all data is filled out!');
    }
}

module.exports.confirm     = confirm;
module.exports.login       = login;
module.exports.register    = register;