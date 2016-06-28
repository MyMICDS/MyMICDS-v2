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

module.exports.getUser  = getUser;
