/**
 * @file Defines authorization-related functions.
 * @module auth
 */

var config      = require(__dirname + '/requireConfig.js');
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
 * @param {string} hash - Hashed password from the database
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

module.exports.confirm = confirm;
module.exports.login   = login;