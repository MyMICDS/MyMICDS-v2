/**
 * @file Handles the login 'Remember Me' cookies
 * @module cookies
 */

var config      = require(__dirname + '/requireConfig.js');
var crypto      = require('crypto');
var cryptoUtils = require(__dirname + '/cryptoUtils.js');
var moment      = require('moment');
var MongoClient = require('mongodb').MongoClient;

/**
 * Clears all the expired cookies in the database
 * @function clearExpiredCookies
 * 
 * @param {clearExpiredCookies} callback
 */

/**
 * Callback after the expired cookies are cleared
 * @callback clearExpiredCookies
 * 
 * @param {Boolena} response
 */

function clearExpiredCookies(callback) {
	MongoClient.connect(config.mongodbURI, function(err, db) {
		var rememberdata = db.collection('remember');
		rememberdata.deleteMany({expires:''});
	});
}

/**
 * Compares the 
 * @function compareCookie
 * 
 * @param {string} user - Username
 * @param {selector} selector - Selector, first part of cookie
 * @param {token} token - Token, second part of cookie, SHA-256 hashed version is stored in database
 * @param {compareCookieCallback}
 */

/**
 * Callback after cookie is compared against the database
 * @callback compareCookieCallback
 * 
 * @param {string|Boolean} user - Username of cookie, false if error
 * @param {string|Boolean} token - New token to be placed in cookie or false if error
 * @param {Object|Boolean} expires - Javascript Date Object of expiring date, false if error
 */

function compareCookie(selector, token, callback) {
    cryptoUtils.shaHash(token, function(hashedToken) {
        MongoClient.connect(config.mongodbURI, function(err, db) {

            var rememberdata = db.collection('remember');
            rememberdata.find({selector: selector}).next(function(err, doc) {

                if(!err && doc) {
                    var cookie  = doc;
					var user    = cookie['user'];
                    var dbToken = cookie['token'];
                    var expires = cookie['expires'];
                    
                    var today   = new Date();
                    if(expires.getTime() > today.getTime()) {

                        if(cryptoUtils.safeCompare(hashedToken, dbToken)) {
                            
                            // Update token if successful
                            
                            generateToken(user, selector, expires, function(newToken) {
                                if(token) {
                                    callback(user, newToken, expires);
                                } else {
                                    callback(false, false, false);
                                }
                            });
                            
                        } else {
                            callback(false, false, false);
                        }

                    } else {
                        callback(false, false, false);
                    }

                } else {
                    callback(false, false, false);
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
 * @param {string|Boolean} selector - Selector to be placed in cookie or false if error
 * @param {string|Boolean} token - Token to be placed in cookie or false if error
 * @param {Object|Boolean} expires - Javascript date object of when cookie expires, or false if error
 */

function createCookie(user, callback) {
    
    var expires = moment().add(30, 'days').toDate();
    crypto.randomBytes(16, function(err, selectorBuf) {
        
		if(!err) {
		
			var selector = selectorBuf.toString('hex');

			generateToken(user, selector, expires, function(token) {
				if(token) {
					callback(selector, token, expires);
				} else {
					callback(false, false, false);
				}
			});
		} else {
			callback(false, false, false);
		}
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
 * @param {string|Boolean} token - New token to be given to client, false if error
 */

function generateToken(user, selector, expires, callback) {
    crypto.randomBytes(32, function(err, tokenBuf) {

        var token = tokenBuf.toString('hex');

        // Hash token for database
        cryptoUtils.shaHash(token, function(hashedToken) {

            // Insert token and hashed password in database
            MongoClient.connect(config.mongodbURI, function(err, db) {
				if(!err) {
					var rememberdata = db.collection('remember');
					rememberdata.update({selector: selector}, {
						user    : user,
						selector: selector,
						token   : hashedToken,
						expires : expires,
						
					}, {upsert: true}, function(err) {

                        db.close();
                        if(!err) {
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

module.exports.clearExpiredCookies = clearExpiredCookies;
module.exports.createCookie        = createCookie;
module.exports.remember            = remember;