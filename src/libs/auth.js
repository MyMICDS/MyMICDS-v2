/**
 * @file Defines authorization-related functions.
 * @module auth
 */

var config      = require(__dirname + '/config.js');
var cryptoUtils = require(__dirname + '/cryptoUtils.js');
var bcrypt      = require('bcrypt');
var MongoClient = require('mongodb').MongoClient;
var utils       = require(__dirname + '/utils.js');

/**
 * Determines if a given password matches the encrypted one in the database
 * @function comparePassword
 *
 * @param {string} user - User that's trying to log in
 * @param {string} password - Unencrypted password
 * @param {comparePasswordCallback} callback - Callback
 */

/**
 * Callback after the password is compared
 * @callback comparePasswordCallback
 *
 * @param {Object} err - Null if successful, error object if failure
 * @param {Boolean} res - True if password matches in database, false if not. Null if error.
 */

function comparePassword(user, password, callback) {

	// Check inputs
	if(typeof callback !== 'function') return;

	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'), null);
		return;
	}

	if(typeof password !== 'string') {
		callback(new Error('Invalid password!'), null);
		return;
	}

	// Connect to database
    MongoClient.connect(config.mongodbURI, function(err, db) {
		if(err) {
			callback(new Error('There was a problem connecting to the database!'), null);
			return;
		}

        var userdata = db.collection('users');
		// Find document of specified user
        userdata.find({ user: user }).next(function(err, doc) {
			db.close();

			if(err) {
				callback(new Error('There was a problem querying the database!'), null);
				return;
			}

			// If no documents returned, username invalid
			if(doc === null) {
				callback(new Error('Username doesn\'t exist!'), null);
				return;
			}

			var hash = doc['password'];

			// Compare passwords
			bcrypt.compare(password, hash, function(err, res) {
				if(err) {
					callback(new Error('There was a problem validating the password!'), null);
					return;
				}

				callback(null, res);
			});
        });
    });

}

/**
 * Confirms a user's account if hash matches
 * @function confirm
 *
 * @param {string} user - Username
 * @param {string} hash - Hashed password from the database
 * @param {confirmCallback} callback - Callback
 */

/**
 * Callback after the account has is confirmed
 * @callback confirmCallback
 *
 * @param {Object} err - Null if successful, error object if failure
 */

function confirm(user, hash, callback) {

	if(typeof callback !== 'function') {
		callback = function() {};
	};

	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'));
		return;
	}

	if(typeof hash !== 'string') {
		callback(new Error('Invalid hash!'));
		return;
	}

	MongoClient.connect(config.mongodbURI, function(err, db) {
		if(err) {
			callback(new Error('There was a problem connecting to the database!'));
			return;
		}

        var userdata = db.collection('users');
        userdata.find({ user: user }).next(function(err, doc) {

			if(err) {
				callback(new Error('There was a problem querying the database!'));
				return;
			}

			if(doc === null) {
				callback(new Error('Username doesn\'t exist!'));
				return;
			}

            var dbHash = doc['confirmationHash'];

            if(cryptoUtils.safeCompare(hash, dbHash)) {
				// Hash matches, confirm account!
                userdata.update({ user: user.toLowerCase() }, {$set: {confirmed: true}}, function(err, results) {
					if(err) {
						callback(new Error('There was a problem updating the database!'));
						reutrn;
					}
                    callback(null);
                });
            } else {
				// Hash does not match
                callback(new Error('Hash not valid!'));
            }
        });
	});
}

/**
 * Validates a user's credentials and updates the 'lastLogin' field.
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
 * @param {Object} err - Null if successful, error object if failure
 * @param {Boolean} res- True if password matches in database, false if not. Null if error.
 */

function login(user, password, callback) {

	if(typeof callback !== 'function') return;

	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'));
		return;
	}

	if(typeof password !== 'string') {
		callback(new Error('Invalid password!'));
		return;
	}

    comparePassword(user, password, function(err, res) {
		if(err) {
			callback(err);
			return;
		}

		if(response) {
			// Credentials are valid!

			// Update lastLogin and lastOnline
            MongoClient.connect(config.mongodbURI, function(connectErr, db) {
                var userdata = db.collection('users');
                userdata.update({ user: user }, { $currentDate: { lastLogin: true, lastOnline: true }});
            });
			callback(null, true);
		} else {
			// Redentials are invalid
            callback(null, false);
        }
	});
}

module.exports.confirm = confirm;
module.exports.login   = login;
