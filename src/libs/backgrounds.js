'use strict';

/**
 * @file Background management functions
 * @module backgrounds
 */

var _      = require('underscore');
var fs     = require('fs-extra');
var Jimp   = require('jimp');
var multer = require('multer');
var path   = require('path');


// Where public accesses backgrounds
var userBackgroundUrl = '/user-backgrounds';
// Where to store user backgrounds
var userBackgroundsDir = __dirname + '/../public' + userBackgroundUrl;
// Default user background
var defaultBackgroundUser = 'default';
var defaultExtention = '.jpg';
// Valid background variations
var validVariations = [
	'normal',
	'blur'
];

// How many pixels to apply gaussian blur radius by default
var defaultBlurRadius = 10;

/**
 * Returns a function to upload a user background. Can be used as Express middleware, or by itself.
 * @function uploadBackground
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {function}
 */

function uploadBackground(db) {

	var validMimeTypes = {
		'image/png' : 'png',
		'image/jpeg': 'jpg'
	};

	var storage = multer.diskStorage({
		destination: function(req, file, cb) {
			// Delete current background
			deleteBackground(req.user.user, function(err) {
				if(err) {
					cb(err, null);
					return;
				}

				// Make sure directory is created for user backgrounds
				var userDir = userBackgroundsDir + '/' + req.user.user;
				fs.ensureDir(userDir, function(err) {
					if(err) {
						cb(new Error('There was a problem ensuring the image directory!'), null);
						return;
					}
					cb(null, userDir);
				});
			});
		},

		filename: function(req, file, cb) {
			// Get valid extention
			var extention = validMimeTypes[file.mimetype];
			// Set base file name to username
			var filename = 'normal.' + extention;

			cb(null, filename);
		}
	});

	var upload = multer({
		storage: storage,
		fileFilter: function(req, file, cb) {
			if(!req.user.user) {
				cb(new Error('You must be logged in!'), null);
				return;
			}
			var extention = validMimeTypes[file.mimetype];
			if(typeof extention !== 'string') {
				cb(new Error('Invalid file type!'), null);
				return;
			}

			cb(null, true);
		}
	});

	return upload.single('background');
}

/**
 * Gets the extention of the user's background
 * @function getExtention
 *
 * @param {string} user - Username
 * @param {getExtentionCallback} callback - Callback
 */

/**
 * Returns a string containing extention
 * @callback getExtentionCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {string} extention - String containing extention of user background. Contains the dot (.) at the beginning of the extention. Null if error or user doesn't have background.
 */

function getExtention(user, callback) {
	if(typeof callback !== 'function') return;

	if(typeof user !== 'string' || !validUsername(user)) {
		callback(new Error('Invalid username!'), null);
		return;
	}

	// Check if user's backgrounds directory is valid
	fs.stat(userBackgroundsDir + '/' + user, function(err, stats) {
		// Test if valid directory
		if(err || !stats.isDirectory()) {
			callback(null, null);
			return;
		}

		// Get user's background file
		fs.readdir(userBackgroundsDir + '/' + user, function(err, userImages) {
			if(err) {
				callback(new Error('There was a problem fetching all of user\'s backgrounds!'), null);
				return;
			}

			// Just get any image, they're all going to be the same extention
			var file = path.parse(userImages[0]);
			var extention = file.ext;

			callback(null, extention);

		});
	});
}

/**
 * Deletes all images of user
 * @function deleteBackground
 *
 * @param {string} user - Username
 * @param {deleteBackgroundCallback} callback - Callback
 */

/**
 * Returns an error if any
 * @callback deleteBackgroundCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 */

function deleteBackground(user, callback) {
	if(typeof callback !== 'function') {
		callback = function() {};
	}

	if(typeof user !== 'string' || !validUsername(user)) {
		callback(new Error('Invalid user!'));
		return;
	}

	// List all files in user backgrounds directory
	fs.emptyDir(userBackgroundsDir + '/' + user, function(err) {
		if(err) {
			callback(new Error('There was a problem deleting the user\'s backgrounds!'));
			return;
		}
		callback(null);
	});
}

/**
 * Returns a URL to display as a background for a certain user
 * @function getBackground
 *
 * @param {string} user - Username
 * @param {getBackgroundCallback} callback - Callback
 */

/**
 * Returns valid URL
 * @callback getBackgroundCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {string} backgroundURLs - Object of background URL variations
 */

function getBackground(user, callback) {
	if(typeof callback !== 'function') return;

	var defaultBackground =  {
		normal: userBackgroundUrl + '/' + defaultBackgroundUser + '/normal' + defaultExtention,
		blur  : userBackgroundUrl + '/' + defaultBackgroundUser + '/blur' + defaultExtention
	};

	if(typeof user !== 'string' || !validUsername(user)) {
		callback(null, defaultBackground);
		return;
	}

	// Get user's extention
	getExtention(user, function(err, extention) {
		if(err) {
			callback(err, defaultBackground);
			return;
		}
		if(extention === null) {
			callback(null, defaultBackground);
			return;
		}

		var backgrounds = {
			normal: userBackgroundUrl + '/' + user + '/normal' + extention,
			blur  : userBackgroundUrl + '/' + user + '/blur' + extention
		};

		callback(null, backgrounds);

	});
}

/**
 * Adds a blur to an image
 * @function addBlur
 *
 * @param {string} fromPath - Path to image (png or jpg only)
 * @param {string} toPath - Path to put blurred image
 * @param {Number} blurRadius - Gaussian blur radius
 * @param {addBlurCallback} callback - Callback
 */

/**
 * Returns error if any
 * @callback addBlurCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 */

function addBlur(fromPath, toPath, blurRadius, callback) {
	if(typeof callback !== 'function') {
		callback = function() {};
	}

	if(typeof blurRadius !== 'number') {
		blurRadius = defaultBlurRadius;
	}

	Jimp.read(fromPath, function(err, image) {
		if(err) {
			callback(new Error('There was a problem reading the image!'));
			return;
		}

		image.blur(blurRadius).write(toPath, function(err) {
			if(err) {
				callback(new Error('There was a problem saving the image!'));
				return;
			}

			callback(null);

		});
	});
}

/**
 * Creates a blurred version of a user's background
 * @function blurUser
 *
 * @param {string} user - Username
 * @param {blurUserCallback} callback - Callback
 */

/**
 * Returns error if any
 * @callback blurUserCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 */

function blurUser(user, callback) {
	if(typeof callback !== 'function') {
		callback = function() {};
	}

	if(typeof user !== 'string' || !validUsername(user)) {
		callback(new Error('Invalid username!'));
		return;
	}

	getExtention(user, function(err, extention) {
		if(err) {
			callback(err);
			return;
		}
		if(extention === null) {
			callback(null);
			return;
		}

		var userDir = userBackgroundsDir + '/' + user;
		var fromPath = userDir + '/normal' + extention;
		var toPath = userDir + '/blur' + extention;

		addBlur(fromPath, toPath, defaultBlurRadius, function(err) {
			if(err) {
				callback(err);
				return;
			}

			callback(null);

		});
	});
}

/**
 * Tests whether username is valid username to prevent users from deleting files outside their background (Ex. '../../some/other/directory')
 * @function validUsername
 * @returns {Boolean}
 */

function validUsername(username) {
	var nonoChars = [
		'..',
		'/',
		'\\'
	];
	return !_.contains(nonoChars, username);
}

module.exports.getBackground    = getBackground;
module.exports.uploadBackground = uploadBackground;
module.exports.deleteBackground = deleteBackground;
module.exports.blurUser         = blurUser;
