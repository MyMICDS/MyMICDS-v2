'use strict';

/**
 * @file User management functions
 * @module users
 */

var _      = require('underscore');
var fs     = require('fs-extra');
var moment = require('moment');
var multer = require('multer');
var path   = require('path');

// Where to store user backgrounds
var userBackgroundsDir = __dirname + '/../public/images/backgrounds/user-backgrounds';

/**
 * Get data about user
 * @function getUser
 *
 * @param {Object} db - Database connection
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

function getUser(db, user, callback) {
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid databse connection!'), null, null);
		return;
	}
	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'), null, null);
		return;
	}

	var userdata = db.collection('users');
	// Query database to find possible user
	userdata.find({ user: user }).toArray(function(err, docs) {
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
}

/**
 * Retrieves basic information about a specific user
 * @function getInfo
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {Boolean} privateInfo - Whether to include sensitive information such as canvasURL and portalURL. Set to true if only the user is viewing it. Defaults to false.
 * @param {getInfoCallback} callback - Callback
 */

/**
 * Returns basic information about the user
 * @callback getInfoCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} userInfo - Object containing information about the user. Null if error.
 */

function getInfo(db, user, privateInfo, callback) {
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}
	if(typeof privateInfo !== 'boolean') {
		privateInfo = false;
	}

	getUser(db, user, function(err, isUser, userDoc) {
		if(err) {
			callback(err, null);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'), null);
			return;
		}

		// Create userInfo object and manually move values from database.
		// We don't want something accidentally being released to user.
		var userInfo = {};
		userInfo.user      = userDoc['user'];
		userInfo.password  = 'Hunter2'; /** @TODO: Fix glitch? Shows up as ******* for me. */
		userInfo.firstName = userDoc['firstName'];
		userInfo.lastName  = userDoc['lastName'];
		userInfo.gradYear  = userDoc['gradYear'];
		userInfo.grade     = gradYearToGrade(userDoc['gradYear']);

		if(privateInfo) {
			if(typeof userDoc['canvasURL'] === 'string') {
				userInfo.canvasURL = userDoc['canvasURL'];
			} else {
				userInfo.canvasURL = null;
			}

			if(typeof userDoc['portalURL'] === 'string') {
				userInfo.portalURL = userDoc['portalURL'];
			} else {
				userInfo.portalURL = null;
			}
		}

		callback(null, userInfo);

	});
}

/**
 * Change basic user information such as name or grade
 * @function changeInfo
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {Object} info - Information to change about user.
 * @param {string} [info.firstName] - First name of user
 * @param {string} [info.lastName] - Last name of user
 * @param {Number} [info.gradYear] - Graduation year of user. Set null if faculty.
 * @param {changeInfoCallback} callback - Callback
 */

/**
 * Returns whether successful or not.
 * @callback changeInfoCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 */

function changeInfo(db, user, info, callback) {
	if(typeof callback !== 'function') {
		callback = function() {};
	}

	if(typeof info !== 'object') {
		callback(new Error('Invalid information!'));
		return;
	}
	// I mean if they want nothing changed, I guess there's no error
	if(_.isEmpty(info)) {
		callback(null);
		return;
	}

	getUser(db, user, function(err, isUser, userDoc) {
		if(err) {
			callback(err);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'));
			return;
		}

		// See what information the user wants changed
		var set = {};

		if(typeof info.firstName === 'string') {
			set.firstName = info.firstName;
		}
		if(typeof info.lastName === 'string') {
			set.lastName = info.lastName;
		}
		if(info.gradYear === null) {
			set.gradYear = null;
		} else if(typeof info.gradYear === 'number' && info.gradYear % 1 === 0 && !_.isNaN(info.gradYear)) {
			set.gradYear = info.gradYear;
		}

		if(_.isEmpty(set)) {
			callback(null);
			return;
		}

		// Update data
		var userdata = db.collection('users');
		userdata.update({ _id: userDoc['_id'], user: user }, { $set: set }, { upsert: true }, function(err, results) {
			if(err) {
				callback(new Error('There was a problem updating the databse!'));
				return;
			}

			callback(null);

		});
	});
}

/**
 * Returns a function to upload a user background. Can be used as Express middleware, or by itself.
 * @function uploadBackground
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {function}
 */

/**
 * Returns function to upload images
 * @callback uploadBackgroundCallback
 *
 * @param {Object} upload - Function to call to upload images
 */

function uploadBackground(db) {

	var validMimeTypes = {
		'image/png' : 'png',
		'image/jpeg': 'jpg',
		'image/gif' : 'gif'
	};

	var storage = multer.diskStorage({
		destination: function(req, file, cb) {
			// Make sure directory is created for user backgrounds
			fs.ensureDir(userBackgroundsDir, function(err) {
				if(err) {
					cb(new Error('There was a problem saving the image!'), null);
					return;
				}
				cb(null, userBackgroundsDir);
			});
		},

		filename: function(req, file, cb) {
			// Get valid extention
			var extention = validMimeTypes[file.mimetype];
			// Set base file name to username
			var filename = req.session.user + '.' + extention;

			// Also delete any existing user backgrounds
			deleteBackground(req.session.user, function(err) {
				if(err) {
					cb(err, null);
					return;
				}
				cb(null, filename);
			});
		}
	});

	var upload = multer({
		storage: storage,
		fileFilter: function(req, file, cb) {
			if(!req.session.user) {
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
 * Scans the user backgrounds directory and returns any files that have a base name of the specified user
 * @function scanBackgrounds
 *
 * @param {string} user - Username
 * @param {scanBackgroundsCallback} callback - Callback
 */

/**
 * Returns an array of filenames
 * @callback scanBackgroundsCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} files - Array of filenames in the user backgrounds directory. Null if error.
 */

function scanBackgrounds(user, callback) {
	if(typeof callback !== 'function') return;

	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'), null);
		return;
	}

	fs.readdir(userBackgroundsDir, function(err, files) {
		if(err) {
			callback(new Error('There was a problem fetching a list of user backgrounds!'), null);
			return;
		}

		var validBackgrounds = [];
		for(var i = 0; i < files.length; i++) {
			var file = path.parse(files[i]);

			// If basename is equivalent to the username, add to delete queue.
			if(file.name === user) {
				validBackgrounds.push(file.base);
			}
		}

		callback(null, validBackgrounds);

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

	if(typeof user !== 'string') {
		callback(new Error('Invalid user!'));
		return;
	}

	// List all files in user backgrounds directory
	scanBackgrounds(user, function(err, files) {

		// Go through all of the files.
		function filterFile(i) {
			if(i < files.length) {
				var deletePath = userBackgroundsDir + '/' + files[i];
				fs.remove(deletePath, function(err) {
					if(err) {
						callback(new Error('There was a problem deleting your existing background!'));
						return;
					}

					filterFile(++i);
				});
			} else {
				// Done going through files
				callback(null);
			}
		}
		filterFile(0);

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
 * @param {string} backgroundURL - URL of background to display to user.
 */

function getBackground(user, callback) {
	if(typeof callback !== 'function') return;

	var defaultBackground = '/images/backgrounds/middleschool/mac.jpg';

	if(typeof user !== 'string') {
		callback(null, defaultBackground);
		return;
	}

	// Scan directory
	scanBackgrounds(user, function(err, files) {
		if(err) {
			callback(err, null);
			return;
		}

		if(err || files.length === 0) {
			// Fallback to default background
			var backgroundURL = defaultBackground;
		} else {
			// User background
			var backgroundURL = '/images/backgrounds/user-backgrounds/' + files[0];
		}

		callback(null, backgroundURL);
	});
}

/**
 * Returns a Moment.js object the date and time school is going to end
 * Based on two consecutive years, we have gather enough data and deeply analyzed that the last day of school is _probably_ the last Friday of May.
 * @function lastFridayMay
 * @param {Number} year - Which May to get last Friday from
 * @returns {Object}
 */

function lastFridayMay(year) {
	var current = moment();
	if(typeof year !== 'number' || year % 1 !== 0) {
		year = current.year();
	}

	var lastDayOfMay = moment().year(year).month('May').endOf('month').startOf('day').hours(11).minutes(30);

	/*
	 * Fun fact: This is literally the only switch statement in the whole MyMICDS codebase.
	 */

	switch(lastDayOfMay.day()) {
		case 5:
			// If day is already Friday
			var lastDay = lastDayOfMay;
		case 6:
			// Last day is Sunday
			var lastDay = lastDayOfMay.subtract(1, 'day');
		default:
			// Subtract day of week (which cancels it out) and start on Saturday.
			// Then subtract to days to get from Saturday to Friday.
			var lastDay = lastDayOfMay.subtract(lastDayOfMay.day() + 2, 'days');
	}

	return lastDay;
}

/**
 * Returns a Moment.js object when the next last day of school is.
 * Based on two consecutive years, we have gather enough data and deeply analyzed that the last day of school is _probably_ the last Friday of May.
 * @function schoolEnds
 * @returns {Object}
 */

function schoolEnds() {
	var current = moment();
	var lastDayThisYear = lastFridayMay();

	if(lastDayThisYear.isAfter(current)) {
		return lastDayThisYear;
	} else {
		return lastFridayMay(current.year() + 1);
	}
}

/**
 * Converts a graduation year to a grade.
 * If the grade is Junior-Kindergarten (JK) or Senior-Kindergarten (SK) then the respective -1 and 0 integers are returned.
 * @function gradYearToGrade
 *
 * @param {Number} gradYear - Graduation year
 * @returns {Number}
 */

function gradYearToGrade(gradYear) {
	if(typeof gradYear !== 'number' || gradYear % 1 !== 0) return null;

	var current = moment();
	var differenceYears = current.year() - gradYear;
	var grade = 12 + differenceYears;

	// If last day of school has already passed, you completed a grade of school
	var schoolEnd = lastFridayMay();
	if(current.isAfter(schoolEnd)) {
		grade++;
	}

	return grade;
}

/**
 * Converts a grade to a graduation year.
 * If you want to enter the grade Junior-Kindergarten (JK) or Senior-Kindergarten (SK) then insert the respective integers -1 and 0.
 * @function gradeToGradYear
 *
 * @param {Number} grade - Grade
 * @returns {Number}
 */

function gradeToGradYear(grade) {
	if(typeof grade !== 'number' || grade % 1 !== 0) return null;

	var current = moment();

	// If last day of school has already passed, round year down
	var schoolEnd = lastFridayMay();
	if(current.isAfter(schoolEnd)) {
		grade--;
	}

	var differenceYears = grade - 12;
	var gradYear = current.year() - differenceYears;

	return gradYear;
}

module.exports.getUser          = getUser;
module.exports.getInfo          = getInfo;
module.exports.changeInfo       = changeInfo;
module.exports.getBackground    = getBackground;
module.exports.uploadBackground = uploadBackground;
module.exports.schoolEnds       = schoolEnds;
module.exports.gradYearToGrade  = gradYearToGrade;
module.exports.gradeToGradYear  = gradeToGradYear;
