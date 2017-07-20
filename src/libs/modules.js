'use strict';

/**
 * @file Functions dealing with the homepage module system
 * @module modules
 */

const _ = require('underscore');
const { ObjectID } = require('mongodb');
const users = require(__dirname + '/users.js');

// All allowed modules
const moduleList = ['date', 'lunch', 'progress', 'quotes', 'schedule', 'snowday', 'stickynotes', 'weather'];

// Range column indexes start at (inclusive)
const columnStarts = 0;
// Max number of columns
const columnsPerRow = 4;

// Range row indexes start at (inclusive)
const rowStarts = 0;

// Modules to give user if none found
const defaultModules = [
	{
		type: 'progress',
		row: 0,
		column: 0,
		width: columnsPerRow,
		height: 3,
		data: {
			date: true
		}
	},
	{
		type: 'schedule',
		row: 3,
		column: 0,
		width: columnsPerRow / 2,
		height: 1
	},
	{
		type: 'weather',
		row: 3,
		column: columnsPerRow / 2,
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

	// Check for user validity, get ID
	users.get(db, user || '', (err, isUser, userDoc) => {
		if(err) {
			callback(err, null);
			return;
		}

		// If user doesn't exist, return default modules
		if(!isUser) {
			callback(null, defaultModules);
			return;
		}

		const moduledata = db.collection('modules');

		moduledata.find({ user: userDoc['_id'] }).toArray((err, modules) => {
			if(err) {
				callback(err, null);
				return;
			}

			// Return default modules if none found, else return found documents
			callback(null, modules.length === 0 ? defaultModules : modules);
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
	users.get(db, user, (err, isUser, userDoc) => {
		if(err) {
			callback(err);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'));
			return;
		}
		if(!modules.every(m => _.contains(moduleList, m.type))) {
			callback(new Error('Invalid module type!'));
			return;
		}
		if(!modules.every(m => m.width > 0)) {
			callback(new Error('Modules must be at least 1 cell wide!'));
			return;
		}
		if(!modules.every(m => m.height > 0)) {
			callback(new Error('Modules must be at least 1 cell tall!'));
			return;
		}
		if(!modules.every(m => (columnStarts <= m.column) && (m.column + m.width - columnStarts <= columnsPerRow))) {
			callback(new Error(`Module column exceeds range between ${columnStarts} - ${columnsPerRow}!`));
			return;
		}
		if(!modules.every(m => (rowStarts <= m.row))) {
			callback(new Error(`Module row below minimum value of ${rowStarts}!`));
			return;
		}

		const moduleGrid = [];

		for(const mod of modules) {
			for(let j = mod.row; j <= mod.row + mod.height - 1; j++) {
				if(typeof moduleGrid[j] !== 'object') moduleGrid[j] = [];

				for(let k = mod.column; k <= mod.column + mod.width - 1; k++) {
					if(moduleGrid[j][k]) {
						callback(new Error('Modules overlap!'));
						return;
					}

					moduleGrid[j][k] = true;
				}
			}
		}

		const moduledata = db.collection('modules');

		// Delete all modules not included in new upsert request
		moduledata.deleteMany({ _id: { $nin: modules.map(m => new ObjectID(m['_id'])) }, user: userDoc['_id'] }, err => {
			if(err) {
				callback(err);
				return;
			}

			// Find all remaining modules so we know which id's are real or not
			moduledata.find({ user: userDoc['_id'] }).toArray((err, dbModules) => {

				const dbModuleIds = [];

				for(const mod of dbModules) {
					dbModuleIds.push(mod['_id'].toHexString());
				}

				function handleModule(i) {
					if(i < modules.length) {
						const mod = modules[i];

						// If _id doesn't exist or is invalid, create a new one
						if (!mod['_id'] || !dbModuleIds.includes(mod['_id'])) {
							mod['_id'] = new ObjectID();
						} else {
							// Current id is valid. All we need to do is convert it to a Mongo id object
							mod['_id'] = new ObjectID(mod['_id']);
						}

						// Make sure user is an ObjectID and not a string
						mod['user'] = userDoc['_id'];

						moduledata.update({ _id: mod['_id'], user: userDoc['_id'] }, { $set: mod }, { upsert: true }, err => {
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
		});
	});
}

module.exports.get = getModules;
module.exports.upsert = upsertModules;
