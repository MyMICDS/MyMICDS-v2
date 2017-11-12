'use strict';

/**
 * @file Background management functions
 * @module backgrounds
 */
const config = require(__dirname + '/config.js');

const _ = require('underscore');
const fs = require('fs-extra');
const Jimp = require('jimp');
const multer = require('multer');
const path = require('path');
const utils = require(__dirname + '/utils.js');

// Valid MIME Types for image backgrounds
const validMimeTypes = {
	'image/png': 'png',
	'image/jpeg': 'jpg'
};
// These are only for finding what kind of image the user has saved.
// This DOES NOT check whether an uploaded image is valid! Configure that via MIME Types!
const validExtensions = [
	'.png',
	'.jpg'
];

// Where public accesses backgrounds
const userBackgroundUrl = config.hostedOn + '/user-backgrounds';
// Where to store user backgrounds
const userBackgroundsDir = __dirname + '/../public/user-backgrounds';
// Default user background
const defaultBackgroundUser = 'default';
const defaultExtension = '.jpg';

// How many pixels to apply gaussian blur radius by default
const defaultBlurRadius = 10;

/**
 * Returns a function to upload a user background. Can be used as Express middleware, or by itself.
 * @function uploadBackground
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {function}
 */

function uploadBackground() {

	const storage = multer.diskStorage({
		destination: (req, file, cb) => {
			// Delete current background
			deleteBackground(req.apiUser, err => {
				if (err) {
					cb(err, null);
					return;
				}

				// Make sure directory is created for user backgrounds
				const userDir = userBackgroundsDir + '/' + req.apiUser + '-' + Date.now();
				fs.ensureDir(userDir, err => {
					if (err) {
						cb(new Error('There was a problem ensuring the image directory!'), null);
						return;
					}
					cb(null, userDir);
				});
			});
		},

		filename: (req, file, cb) => {
			// Get valid extension
			const extension = validMimeTypes[file.mimetype];
			// Set base file name to username
			const filename = 'normal.' + extension;

			cb(null, filename);
		}
	});

	const upload = multer({
		storage,
		fileFilter: (req, file, cb) => {
			if (!req.apiUser) {
				cb(new Error('You must be logged in!'), null);
				return;
			}
			const extension = validMimeTypes[file.mimetype];
			if (typeof extension !== 'string') {
				cb(new Error('Invalid file type!'), null);
				return;
			}

			cb(null, true);
		}
	});

	return upload.single('background');
}

/**
 * Gets the extension of the user's background
 * @function getCurrentFiles
 *
 * @param {string} user - Username
 * @param {getCurrentFilesCallback} callback - Callback
 */

/**
 * Returns a string containing extension
 * @callback getCurrentFilesCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {string} dirname - Name of directory containing background. Null if error or user doesn't have background.
 * @param {string} extension - String containing extension of user background. Contains the dot (.) at the beginning of the extension. Null if error or user doesn't have background.
 */

function getCurrentFiles(user, callback) {
	if(typeof callback !== 'function') return;

	if(typeof user !== 'string' || !utils.validFilename(user)) {
		callback(new Error('Invalid username!'), null);
		return;
	}

	fs.readdir(userBackgroundsDir, (err, userDirs) => {
		if(err) {
			callback(new Error('There was a problem reading the user backgrounds directory!'), null, null);
			return;
		}

		// Look through all the directories
		let userDir = null;
		for(const _dir of userDirs) {
			const dir = path.parse(_dir);
			const dirname = dir.name;
			const dirnameSplit = dirname.split('-');

			// Check directory isn't deleted
			if(dirnameSplit[0] === 'deleted') {
				continue;
			}

			// Get rid of timestamp and get name
			dirnameSplit.pop();

			// Directory owner's username (which may have dashes in it)
			const directoryOwner = dirnameSplit.join('-');

			// Check if background belongs to user
			if(directoryOwner === user) {
				userDir = dirname;
				break;
			}
		}

		// User doesn't have any background
		if(userDir === null) {
			callback(null, null, null);
			return;
		}

		// Read user's background file
		fs.readdir(userBackgroundsDir + '/' + userDir, (err, userImages) => {
			if(err) {
				callback(new Error('There was a problem reading the user\'s background directory!'), null, null);
				return;
			}

			// Loop through all valid files until there's either a .png or .jpg extention
			let userExtension = null;
			for(const _file of userImages) {
				const file = path.parse(_file);
				const extension = file.ext;

				// If valid extension, just break out of loop and return that
				if(_.contains(validExtensions, extension)) {
					userExtension = extension;
					break;
				}
			}

			callback(null, userDir, userExtension);

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
		callback = () => {};
	}

	if(typeof user !== 'string' || !utils.validFilename(user)) {
		callback(new Error('Invalid user!'));
		return;
	}

	// Find out user's current directory
	getCurrentFiles(user, (err, dirname, extension) => {
		if(err) {
			callback(err);
			return;
		}
		// Check if no existing background
		if(dirname === null || extension === null) {
			callback(null);
			return;
		}

		const currentPath = userBackgroundsDir + '/' + dirname;
		const deletedPath = userBackgroundsDir + '/deleted-' + dirname;

		fs.rename(currentPath, deletedPath, err => {
			if(err) {
				callback(new Error('There was a problem deleting the directory!'));
				return;
			}

			callback(null);

		});
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
 * @param {string} variants - Object of background URL variations
 * @param {Boolean} hasDefault - Whether or not user has default background.
 */

function getBackground(user, callback) {
	if(typeof callback !== 'function') return;

	const defaultBackground = {
		normal: userBackgroundUrl + '/' + defaultBackgroundUser + '/normal' + defaultExtension,
		blur: userBackgroundUrl + '/' + defaultBackgroundUser + '/blur' + defaultExtension
	};

	if(typeof user !== 'string' || !utils.validFilename(user)) {
		callback(null, defaultBackground, true);
		return;
	}

	// Get user's extension
	getCurrentFiles(user, (err, dirname, extension) => {
		if(err) {
			callback(err, defaultBackground, true);
			return;
		}
		// Fallback to default background if no custom extension
		if(dirname === null || extension === null) {
			callback(null, defaultBackground, true);
			return;
		}

		const backgroundURLs = {
			normal: userBackgroundUrl + '/' + dirname + '/normal' + extension,
			blur: userBackgroundUrl + '/' + dirname + '/blur' + extension
		};

		callback(null, backgroundURLs, false);
	});
}

/**
 * Pairs all users with their background variants
 * @function getAllBackgrounds
 *
 * @param {Object} db - Database connection
 * @param {getAllBackgroundsCallback} callback - Callback
 */

/**
 * Returns object with users and backgrounds
 * @callback getAllBackgroundsCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Object} backgrounds - Object of all users and backgrounds
 */

function getAllBackgrounds(db, callback) {
	if(typeof callback !== 'function') return;
	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}

	const userdata = db.collection('users');
	userdata.find({ confirmed: true }).toArray((err, users) => {
		if(err) {
			callback(new Error('There was a problem querying the database!'), null);
			return;
		}

		function handleBackground(i, result) {
			if(i < users.length) {
				const user = users[i].user;
				getBackground(user, (err, variants) => {
					if(err) {
						callback(err, null);
						return;
					}

					result[user] = variants;
					handleBackground(++i, result);
				});
			} else {
				callback(null, result);
			}
		}

		handleBackground(0, {});
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
		callback = () => {};
	}

	if(typeof fromPath !== 'string') {
		callback(new Error('Invalid path to original image!'));
		return;
	}
	if(typeof toPath !== 'string') {
		callback(new Error('Invalid path to blurred image!'));
		return;
	}
	if(typeof blurRadius !== 'number') {
		blurRadius = defaultBlurRadius;
	}

	Jimp.read(fromPath, (err, image) => {
		if(err) {
			callback(new Error('There was a problem reading the image!'));
			return;
		}

		image.blur(blurRadius).write(toPath, err => {
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
		callback = () => {};
	}

	if(typeof user !== 'string' || !utils.validFilename(user)) {
		callback(new Error('Invalid username!'));
		return;
	}

	getCurrentFiles(user, (err, dirname, extension) => {
		if(err) {
			callback(err);
			return;
		}
		if(dirname === null || extension === null) {
			callback(null);
			return;
		}

		const userDir = userBackgroundsDir + '/' + dirname;
		const fromPath = userDir + '/normal' + extension;
		const toPath = userDir + '/blur' + extension;

		addBlur(fromPath, toPath, defaultBlurRadius, err => {
			if(err) {
				callback(err);
				return;
			}

			callback(null);
		});
	});
}

module.exports.get    	= getBackground;
module.exports.upload	= uploadBackground;
module.exports.delete 	= deleteBackground;
module.exports.getAll	= getAllBackgrounds;
module.exports.blurUser = blurUser;
