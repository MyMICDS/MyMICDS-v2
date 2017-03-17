'use strict';

/**
 * @file Functions dealing with the homepage module system
 * @module modules
 */

// All allowed modules
var moduleList = ['date', 'lunch', 'progress', 'schedule', 'snowday', 'stickynotes', 'weather'];

var columnsPerRow = 4;

// Modules to give user if none found
var defaultModules = [
	{
		name: 'progress',
		row: 0,
		column: 0,
		width: columnsPerRow,
		height: 1,
		data: {
			date: true
		}
	},
	{
		name: 'schedule',
		row: 1,
		column: 0,
		width: columnsPerRow / 2,
		height: 1
	},
	{
		name: 'weather',
		row: 1,
		column: 1,
		width: columnsPerRow / 2,
		height: 1,
		data: {
			metric: false
		}
	}
];

/**
 * Gets an array of all active modules for a user
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {getModulesCallback} callback - Callback
 */

/**
 * Callback after modules have been retrieved
 * @callback getModulesCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Array} modules - Array of user's currently active modules if success, null ir error
 */
function getModules(db, user, callback) {
	// Input validation
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}

	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'), null);
		return;
	}

	// Check for user validity, get ID
	users.get(db, user, function(err, isUser, userDoc) {
		if(err) {
			callback(err, null);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'), null);
			return;
		}

		var moduledata = db.collection('modules');

		moduledata.find({ user: userDoc['_id'] }).toArray(function(err, modules) {
			if(err) {
				callback(err, null);
				return;
			}

			// Return default modules if none found, else return found documents
			callback(null, modules.length === 0 ? defaultModules : modules)
		});
	});
}

/**
 * Change a user's current modules
 * @param {Object} db - Database object
 * @param {String} user - Username
 * @param {Array} modules - List of modules with changes
 * @param {upsertModulesCallback} callback - Callback
 */

/**
 * Callback after modules are modified
 * @callback upsertModulesCallback
 *
 * @param {Object} err - Null if success, error object if null
 */
function upsertModules(db, user, modules, callback) {
	// Input validation
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}

	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'), null);
		return;
	}

	// Check for user validity, get ID
	users.get(db, user, function(err, isUser, userDoc) {
		if(err) {
			callback(err);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'));
			return;
		}

		var moduledata = db.collection('modules');

		// TODO @michaelgira23

		function handleModule(i) {
			if(i < module.length) {
				moduledata.update({ _id: module['_id'], user: module['user'] }, { $set: module }, { upsert: true }, function(err) {
					if(err) {
						callback(err);
						return;
					}

					handleModule(++i);
				});
			} else {
				callback(null);
			}
		}
		handleModule(0);
	});
}

module.exports.get = getModules;
module.exports.update = updateModules;
