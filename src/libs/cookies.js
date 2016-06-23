/**
 * @file Handles the login 'Remember Me' cookies
 * @module cookies
 */

var config      = require(__dirname + '/config.js');
var crypto      = require('crypto');
var cryptoUtils = require(__dirname + '/cryptoUtils.js');
var moment      = require('moment');
var MongoClient = require('mongodb').MongoClient;

/**
 * Compares the
 * @function compareCookie
 *
 * @param {selector} selector - Selector, first part of cookie
 * @param {token} token - Token, second part of cookie, SHA-256 hashed version is stored in database
 * @param {compareCookieCallback} callback - Callback
 */

/**
 * Callback after cookie is compared against the database
 * @callback compareCookieCallback
 *
 * @param {Object} err- Null if success, error object if failure.
 * @param {string} user - Username of cookie, null if error
 * @param {string} token - New token to be placed in cookie or null if error
 * @param {Object} expires - Javascript Date Object of expiring date, null if error
 */

function compareCookie(selector, token, callback) {

    if(typeof callback !== 'function') return;

    if(typeof selector !== 'string') {
        callback(new Error('Invalid selector!'), null, null, null);
        return;
    }

    if(typeof token !== 'string') {
        callback(new Error('Invalid token!'), null, null, null);
        return;
    }

    // Hash the token to compare with database
    cryptoUtils.shaHash(token, function(hashedToken) {
        MongoClient.connect(config.mongodbURI, function(err, db) {

            if(err) {
                callback(new Error('There was a problem connecting to the database!'), null, null, null);
                return;
            }

            var rememberdata = db.collection('remember');
            rememberdata.find({ selector: selector }).next(function(err, doc) {

                if(err) {
                    callback(new Error('There was a problem querying the database!'), null, null, null);
                    return;
                }

                // Check if valid selector
                if(doc === null) {
                    db.close();
                    callback(new Error('Invalid selector!'), null, null, null);
                    return;
                }

                var cookie  = doc;
                var user    = cookie['user'];
                var dbToken = cookie['token'];
                var expires = cookie['expires'];

                var today = new Date();

                // Check if cookied expired
                if(today.getTime() > expires.getTime()) {
                    db.close();
                    callback(new Error('Cookie has expired!'), null, null, null);
                    return;
                }

                // Compare tokens
                if(cryptoUtils.safeCompare(hashedToken, dbToken)) {

                    // Update token if successful
                    generateToken(user, selector, expires, function(err, newToken) {
                        if(err) {
                            db.close();
                            callback(err, null, null, null);
                            return;
                        }

                        // Update lastLogin
                        var userdata = db.collection('users');
                        userdata.update({ user: user }, { $currentDate: { lastLogin: true, lastOnline: true }});
                        db.close();

                        callback(null, user, newToken, expires);
                    });

                } else {
                    // Hash was invalid
                    db.close();
                    callback(new Error('Invalid hash!'), null, null, null);
                }

            });
        });
    });
}

/**
 * Creates a selector and a token which can be used for the 'Remember Me' feature
 * @function createCookie
 *
 * @param {string} user - Username of cookie
 * @param {createCookieCallback}
 */

/**
 * Callback after creating a 'remember me' cookie
 * @callback createCookieCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {string} selector - Selector to be placed in cookie. Null if error.
 * @param {string} token - Token to be placed in cookie. Null if error.
 * @param {Object} expires - Javascript date object of when cookie expires. Null if error.
 */

function createCookie(user, callback) {

    if(typeof callback !== 'function') return;

    if(typeof user !== 'string') {
        callback(new Error('Invalid username!'), null, null, null);
        return;
    }

    // Add 30 days to get the expire date object
    var expires = moment().add(30, 'days').toDate();

    // Generate random bytes to get a selector
    crypto.randomBytes(16, function(err, selectorBuf) {

		if(err) {
            callback(new Error('There was a problem generating the Remember Me cookie!'), null, null, null);
            return;
        }

		var selector = selectorBuf.toString('hex');

        // Generate a token, which will upsert the selector and username into the database
		generateToken(user, selector, expires, function(err, token) {
            if(err) {
                callback(err, null, null, null);
                return;
            }

			callback(null, selector, token, expires);

		});
    });
}

/**
 * Upsert a new token into the database with the provided selector
 * @function generateToken
 *
 * @param {string} user - Username
 * @param {string} selector - Selector of existing cookie, or a new cookie to be created
 * @param {Object} expires - Javascript Date object of when the cookie expires
 * @param {generateTokenCallback}
 */

/**
 * Callback after a new token is generated
 * @callback generateTokenCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {string} token - New token to be given to client. Null if error.
 */

function generateToken(user, selector, expires, callback) {

    if(typeof callback !== 'function') {
        callback = function() {};
    }

    if(typeof user !== 'string') {
        callback(new Error('Invalid username!'), null);
    }

    crypto.randomBytes(32, function(cryptoErr, tokenBuf) {
        if(!cryptoErr) {
            var token = tokenBuf.toString('hex');

            // Hash token for database
            cryptoUtils.shaHash(token, function(hashedToken) {

                // Insert token and hashed password in database
                MongoClient.connect(config.mongodbURI, function(dbErr, db) {
                    if(!dbErr) {
                        var rememberdata = db.collection('remember');
                        rememberdata.update({selector: selector}, {
                            user    : user,
                            selector: selector,
                            token   : hashedToken,
                            expires : expires,

                        }, {upsert: true}, function(updateErr) {

                            db.close();
                            if(!updateErr) {
                                callback(token);
                            } else {
                                callback(false);
                            }
                        });

                    } else {
                        callback(false);
                    }

                });
            });
        } else {
            callback(false);
        }

    });
}

/**
 * Checks to see if you have a 'remember me' login cookie. If so, automatically log in. This is Express Middleware, so the params are standard
 * @function remember
 *
 * @param {Object} req - Request
 * @param {Object} res - Response
 * @param {Object} next - Callback function
 */

function remember(req, res, next) {
    var cookie = req.cookies.rememberme;

    if(cookie && !req.session.user) {

        var values = cookie.split(':');
        var selector = values[0];
        var token    = values[1];

        compareCookie(selector, token, function(user, newToken, expires) {
            if(user) {
                req.session.user = user;
                res.cookie('rememberme', selector + ':' + newToken, {expires: expires});
            }
            next();
		});
    } else {
        next();
    }
}

module.exports.createCookie        = createCookie;
module.exports.remember            = remember;
