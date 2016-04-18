/**
 * @file User management functions
 * @module users
 */

var config      = require(__dirname + '/requireConfig.js');
var crypto      = require('crypto');
var cryptoUtils = require(__dirname + '/cryptoUtils.js');
var mail        = require(__dirname + '/mail.js');
var MongoClient = require('mongodb').MongoClient;
var utils       = require(__dirname + '/utils.js');

/**
 * Get id of user
 * @function getUser
 * 
 * @param {string} id - User id
 * @param {getUserCallback} callback - Callback
 */

/**
 * Callback after user id is retrieved
 * @callback getUserCallback
 * 
 * @param {string|Boolean} id - User id or false if error
 */

function getUser(id, callback) {
	if(typeof id === 'undefined') {
		callback(false);
		return;
	}
	MongoClient.connect(config.mongodbURI, function(err, db) {
		var userdata  = db.collection('users');
		userdata.find({_id: id}).toArray(function(userError, userDocs) {
			if(!userError && userDocs.length) {
				callback(userDocs[0]['user']);
			} else {
				callback(false);
			}
		});
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

module.exports.getUser  = getUser;
module.exports.register = register;