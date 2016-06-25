/**
 * @file User management functions
 * @module users
 */

var config = require(__dirname + '/config.js');

var crypto      = require('crypto');
var cryptoUtils = require(__dirname + '/cryptoUtils.js');
var mail        = require(__dirname + '/mail.js');
var MongoClient = require('mongodb').MongoClient;

/**
 * Get data about user
 * @function getUser
 *
 * @param {string} user - Username
 * @param {getUserCallback} callback - Callback
 */

/**
 * Callback after user id is retrieved
 * @callback getUserCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Boolean} isUser - True if there is a valid user, false if not. Null if error.
 * @param {Object} userDoc - Everything in the user's document. Null if error or no valid user.
 */

function getUser(user, callback) {

	if(typeof callback !== 'function') return;

	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'), null, null);
		return;
	}

	// Connect to database
	MongoClient.connect(config.mongodbURI, function(err, db) {

		if(err) {
			callback(new Error('There was a problem connecting to the database!'), null, null);
			return;
		}

		var userdata  = db.collection('users');
		// Query database to find possible user
		userdata.find({ user: user }).toArray(function(err, docs) {
			db.close();

			if(err) {
				callback(new Error('There was a problem querying the database!'), null, null);
				return;
			}

			if(docs.length === 0) {
				callback(null, false, null)
			} else {
				callback(null, true, docs[0]);
			}

		});
	});
}

/**
 * Registers a user by adding their credentials into the database. Also sends email confirmation.
 * @function register
 *
 * @param {Object} user - User's credentials
 * @param {string} user.username - Username (___@micds.org)
 * @param {string} user.password - User's plaintext password
 * @param {string} user.firstName - User's first name
 * @param {string} user.lastName - User's last name
 * @param {Number} [user.gradYear] - User's graduation year (Ex. Class of 2019). DO NOT DEFINE IF USER IS A TEACHER!
 *
 * @param {registerCallback} callback - Callback
 */

/**
 * Callback after a user is registered
 * @callback registerCallback
 *
 * @param {Object} err - Null if success, error object if failure
 */

function register(user, callback) {

    // Validate inputs
	if(typeof callback !== 'function') {
		callback = function() {};
	}

	if(typeof user !== 'object') {
		callback(new Error('Invalid user object!'));
		return;
	}

	if(typeof user.username !== 'string') {
		callback(new Error('Invalid username!'));
		return;
	} else {
		// Make sure username is lowercase
		user.username = user.username.toLowerCase();
	}

	if(typeof user.password !== 'string') {
		callback(new Error('Invalid password!'));
		return;
	}

	if(typeof user.firstName !== 'string') {
		callback(new Error('Invalid first name!'));
		return;
	}

	if(typeof user.lastName !== 'string') {
		callback(new Error('Invalid last name!'));
		return;
	}

	if(typeof user.gradYear === 'number' && user.gradYear % 1 === 0) {
		// Valid graduation year, make sure teacher is set to false
		user.teacher = false;
	} else {
		user.teacher = true;
	}

	// Check if it's an already existing user
	getUser(user.username, function(err, isUser, data) {
		if(isUser && data.confirmed) {
			callback(new Error('An account is already registered under the email ' + user.username + '@micds.org!'));
			return;
		}

		// Upsert user into the database
		MongoClient.connect(config.mongodbURI, function(err, db) {

			if(err) {
				db.close();
				callback(new Error('There was a problem connecting to the database!'));
				return;
			}

			var userdata = db.collection('users');

            // Generate confirmation email hash
            crypto.randomBytes(16, function(err, buf) {
                if(err) {
					db.close();
					callback(new Error('There was a problem generating a random confirmation hash!'));
					return;
				}

                var hash = buf.toString('hex');

                // Hash Password
                cryptoUtils.hashPassword(user.password, function(err, hashedPassword) {
					if(err) {
						db.close();
						callback(new Error('There was a problem hashing the password!'));
						return;
					}

                    var newUser = {
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

                    userdata.update({ user: newUser.user }, newUser, { upsert: true }, function(err, data) {
                        db.close();

						if(err) {
							callback(new Error('There was a problem inserting the account into the database!'));
							return;
						}

                        var email = newUser.user + '@micds.org';
                        var emailReplace = {
                            firstName  : newUser.firstName,
                            lastName   : newUser.lastName,
                            confirmLink: 'https://mymicds.net/confirm/' + newUser.user + '/' + hash,
                        }

						// Send confirmation email
                        mail.sendHTML(email, 'Confirm your Account', __dirname + '/../html/messages/register.html', emailReplace, callback);
                    });
                });
			});
		});
	});
}

module.exports.getUser  = getUser;
module.exports.register = register;
