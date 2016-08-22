'use strict';

/**
 * @file Functions for inserting class data
 * @module classes
 */

var _           = require('underscore');
var asyncLib    = require('async');
var ObjectID    = require('mongodb').ObjectID;
var prisma      = require('prisma');
var teachers    = require(__dirname + '/teachers.js');
var users       = require(__dirname + '/users.js');

var Random = require("random-js");
var engine = Random.engines.mt19937().autoSeed();

var validBlocks = [
	'a',
	'b',
	'c',
	'd',
	'e',
	'f',
	'g',
	'sport',
	'other'
];

var validTypes = [
	'art',
	'english',
	'history',
	'math',
	'science',
	'spanish',
	'latin',
	'mandarin',
	'german',
	'french',
	'other'
];

// RegEx to test if string is a valid hex color ('#XXX' or '#XXXXXX')
var validColor = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i;

/**
 * Inserts/updates a class to the database
 * @function upsertClass
 *
 * @param {Object} db - Databse connection
 * @param {string} user - Username to insert the class under
 *
 * @param {Object} scheduleClass - JSON of class to add
 * @param {string} [scheduleClass.id] - Id to modify class under (Optional)
 * @param {string} scheduleClass.name - Name of class
 * @param {string} [scheduleClass.color] - Hex value of class color. Please include hash ('#') symbol. (Optional, default random color)
 * @param {string} [scheduleClass.block] - Which block the class takes place (Optional. Default to 'other')
 * @param {string} [scheduleClass.type] - Type of class (Optional, default to 'other')
 *
 * @param {Object} scheduleClass.teacher - Information about teacher
 * @param {string} scheduleClass.teacher.prefix - Either 'Mr.' or 'Ms.'
 * @param {string} scheduleClass.teacher.firstName - First name of teacher
 * @param {string} scheduleClass.teacher.lastName - Last name of teacher
 *
 * @param {upsertClassCallback} callback - Callback
 */

/**
 * What to do after it adds a class into the database
 * @callback upsertClassCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Object} classId - Object ID of class inserted
 */

function upsertClass(db, user, scheduleClass, callback) {
	// Input validation best validation
	if(typeof callback !== 'function') callback = function() {};
	if(typeof db !== 'object') { callback(new Error('Invalid database connection!'), null); return; }
	if(typeof scheduleClass.id !== 'string') scheduleClass.id = '';

	if(typeof user               !== 'string') { callback(new Error('Invalid username!'),     null); return; }
	if(typeof scheduleClass      !== 'object') { callback(new Error('Invalid class object!'), null); return; }
	if(typeof scheduleClass.name !== 'string') { callback(new Error('Invalid class name!'),   null); return; }
	// If no valid block or type, default to 'other'
	if(!_.contains(validBlocks, scheduleClass.block)) scheduleClass.block = 'other';
	if(!_.contains(validTypes, scheduleClass.type))   scheduleClass.type  = 'other';
	// If not valid color, generate random
	if(!validColor.test(scheduleClass.color)) {
		// You think we're playing around here? No. This is MyMICDS.
		// We are going to crypographically generate a color as random as human intelligence can get us.
		scheduleClass.color = '#' + Random.hex(true)(engine, 6);
	} else {
		// Make sure hex is capitalized
		scheduleClass.color = scheduleClass.color.toUpperCase();
	}

	// Make sure username is valid first
	users.get(db, user, function(err, isUser, userDoc) {
		if(err) {
			callback(new Error('There was a problem connecting to the database!'), null);
			return;
		}
		if(!isUser) {
			callback(new Error('Invalid username!'), null);
			return;
		}

		// Add teacher to database
		teachers.add(db, scheduleClass.teacher, function(err, teacherDoc) {
			if(err) {
				callback(err, null);
				return;
			}

			var classdata = db.collection('classes');

			// Check for duplicate classes first
			classdata.find({ user: userDoc['_id'] }).toArray(function(err, classes) {
				if(err) {
					callback(new Error('There was a problem querying the database!'), null);
					return;
				}

				// Lets see if any of the classes are the one we are supposed to edit
				var validEditId = false;
				if(scheduleClass.id !== '') {
					for(var i = 0; i < classes.length; i++) {
						var classId = classes[i]['_id'];
						if(scheduleClass.id === classId.toHexString()) {
							validEditId = classId;
							break;
						}
					}
				}

				// Now lets see if any of these classes are duplicate
				var dupClassIds = [];
				for(var i = 0; i < classes.length; i++) {
					var classDoc = classes[i];

					// If duplicate class, push id to array
					if(scheduleClass.name  === classDoc.name
						&& teacherDoc['_id'].toHexString() === classDoc['teacher'].toHexString()
						&& scheduleClass.block === classDoc.block
						&& scheduleClass.color === classDoc.color
						&& scheduleClass.type  === classDoc.type) {

						dupClassIds.push(classDoc['_id'].toHexString());
					}
				}

				// If any of the classes are duplicate, just give up.
				if(dupClassIds.length > 0) {
					// If the edit id matches one of the dup classes, maybe the student accidentally pressed 'save'.
					// Since nothing changed in that case, just return no error
					if(validEditId) {
						callback(null, validEditId);
					} else {
						callback(new Error('Tried to insert a duplicate class!'), null);
					}
					return;
				}

				// Generate an Object ID, or use the id that we are editting
				if(validEditId) {
					var id = validEditId;
				} else {
					var id = new ObjectID();
				}

				var insertClass = {
					user: userDoc['_id'],
					name: scheduleClass.name,
					teacher: teacherDoc['_id'],
					type : scheduleClass.type,
					block: scheduleClass.block,
					color: scheduleClass.color,
				}

				// Finally, if class isn't a duplicate and everything's valid, let's insert it into the database
				classdata.update({ _id: id }, insertClass, { upsert: true }, function(err, results) {
					if(err) {
						callback(new Error('There was a problem upserting the class into the database!'), null);
						return;
					}

					callback(null, id);
					teachers.deleteClasslessTeachers(db);

				});
			});
		});
	});
}

/**
 * Gets an array of all the classes under a certain user
 * @function getClasses
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username to get classes under
 * @param {getClassesCallback} callback - Callback
 */

/**
 * Callback after all classes have been retrieved
 * @callback getClassesCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Object} classes - Array of class documents with teacher documents injected in. Null if error.
 */

function getClasses(db, user, callback) {
	// I'll validate _your_ input baby ;)
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}
	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'), null);
		return;
	}

	// Make sure valid user and get user id
	users.get(db, user, function(err, isUser, userDoc) {
		if(err) {
			callback(err, null);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'), null);
			return;
		}

		var classdata = db.collection('classes');

		// Get all classes under the specified user id
		classdata.find({ user: userDoc['_id'] }).toArray(function(err, classes) {
			if(err) {
				callback(new Error('There was a problem querying the database!'), null);
				return;
			}

			// Add 'textDark' to all of the classes based on color
			for(var i = 0; i < classes.length; i++) {
				classes[i].textDark = prisma.shouldTextBeDark(classes[i].color);
			}

			// Go through all events and set user to actual username, and teacher to actual teacher
			// Save teachers in object so we don't have to query database more than we need to
			var teachersList = {};

			function injectValues(i) {

				if(i < classes.length) {
					// Set user to actual username
					classes[i]['user'] = userDoc['user'];

					// Set teacher to actual teacher
					var teacherId = classes[i]['teacher'];

					if(typeof teachersList[teacherId] === 'undefined') {
						teachers.get(db, teacherId, function(err, isTeacher, teacherDoc) {
							if(err) {
								callback(err, null);
								return;
							}

							teachersList[teacherId] = teacherDoc;
							classes[i]['teacher'] = teachersList[teacherId];
							injectValues(++i);
						});
					} else {
						classes[i]['teacher'] = teachersList[teacherId];
						injectValues(++i);
					}

				} else {
					// Done through all events
					callback(null, classes);

				}
			}
			injectValues(0);

		});
	});
}

/**
 * Deletes a class, and teacher if nobody else has the same teacher
 * @function deleteClass
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username. Input user so we make sure nobody is deleting each other's classes!
 * @param {string} classId - Class id
 * @param {deleteClassCallback} callback - Callback
 */

/**
 * Callback after deletes class
 * @callback deleteClassCallback
 *
 * @param {Object} err - Null if success, error object if failure
 */

function deleteClass(db, user, classId, callback) {
	// Validate inputs
	if(typeof callback !== 'function') {
		callback = function() {};
	}

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}
	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'));
		return;
	}
	// Try to create object id
	try {
		var id = new ObjectID(classId);
	} catch(e) {
		callback(new Error('Invalid event id!'));
		return;
	}

	// Make sure valid user
	users.get(db, user, function(err, isUser, userDoc) {
		if(err) {
			callback(err);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'));
			return;
		}

		var classdata = db.collection('classes');
		classdata.deleteMany({ _id: id, user: userDoc['_id'] }, function(err, results) {
			if(err) {
				callback(new Error('There was a problem deleting the class from the database!'));
				return;
			}

			callback(null);
			teachers.deleteClasslessTeachers(db);

		});
	});
}

module.exports.validBlocks = validBlocks;
module.exports.validTypes  = validTypes;

module.exports.upsert = upsertClass;
module.exports.get    = getClasses;
module.exports.delete = deleteClass;
