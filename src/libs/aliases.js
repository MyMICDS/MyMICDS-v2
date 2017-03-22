'use strict';

/**
 * @file Creates bridges between MyMICDS Native Planner System™ and Portal-Canvas
 * @module alias
 */
const _ = require('underscore');
const asyncLib = require('async');
const classes = require(__dirname + '/classes.js');
const ObjectID = require('mongodb').ObjectID;
const users = require(__dirname + '/users.js');

// Types of aliases
let aliasTypes = [
	'canvas',
	'portal'
];

/**
 * Add an alias that points to a class object
 * @function addCanvasAlias
 *
 * @param {Object} db - Database object
 * @param {string} user - Username
 * @param {string} type - Valid alias type
 * @param {string} classString - Canvas class string
 * @param {string} classId - Native class ID
 * @param {addCanvasAliasCallback} callback - Callback
 */

/**
 * Callback after alias is created
 * @callback addCanvasAliasCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} aliasId - ID Object of alias inserted. Null if error.
 */

function addAlias(db, user, type, classString, classId, callback) {
	if(typeof callback !== 'function') {
		callback = () => {};
	}

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}
	if(!_.contains(aliasTypes, type)) {
		callback(new Error('Invalid alias type!'), null);
		return;
	}
	if(typeof classString !== 'string') {
		callback(new Error('Invalid class string!'), null);
		return;
	}
	if(typeof classId !== 'string') {
		callback(new Error('Invalid class id!'), null);
		return;
	}

	// Make sure valid user
	users.get(db, user, (err, isUser, userDoc) => {
		if(err) {
			callback(err, null);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'), null);
			return;
		}

		// Check if alias already exists
		getAliasClass(db, user, type, classString, (err, hasAlias, classObject) => {
			if(err) {
				callback(err, null);
				return;
			}
			if(hasAlias) {
				callback(new Error('Alias already exists for a class!'), null);
				return;
			}

			// Make sure class id is valid
			classes.get(db, user, (err, classes) => {
				if(err) {
					callback(err, null);
					return;
				}

				// Loop through classes and search for class with id specified
				let validClassObject = null;
				for(let i = 0; i < classes.length; i++) {
					let classObject = classes[i];

					if(classObject._id.toHexString() === classId) {
						validClassObject = classObject;
						break;
					}
				}

				if(!validClassObject) {
					callback(new Error('Native class doesn\'t exist!'), null);
					return;
				}

				// Class is valid! Insert into database
				let insertAlias = {
					user: userDoc['_id'],
					type: type,
					classNative: validClassObject._id,
					classRemote: classString
				};

				// Insert into database
				let aliasdata = db.collection('aliases');

				aliasdata.insert(insertAlias, (err, results) => {
					if(err) {
						callback(new Error('There was a problem inserting the alias into the databse!'), null);
						return;
					}

					let insertedId = results.ops[0]._id;
					callback(null, insertedId);
				});
			});
		});
	});
}

/**
 * Returns an array of aliases registered under a specific user
 * @function listAliases
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {listAliasesCallback} callback - Callback
 */

/**
 * Returns an array of aliases
 * @callback listAliasesCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} aliases - An object containing a key for each alias type, and the value an array of the aliases. Null if error.
 */

function listAliases(db, user, callback) {
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}
	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'), null);
		return;
	}

	// Make sure valid user
	users.get(db, user, (err, isUser, userDoc) => {
		if(err) {
			callback(err, null);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'), null);
			return;
		}

		// Query database for all aliases under specific user
		let aliasdata = db.collection('aliases');
		aliasdata.find({ user: userDoc['_id'] }).toArray((err, aliases) => {
			let i;
			if(err) {
				callback(new Error('There was a problem querying the database!'), null);
				return;
			}

			let aliasList = {};

			// Add array for all alias types
			for(i = 0; i < aliasTypes.length; i++) {
				let aliasType = aliasTypes[i];
				aliasList[aliasType] = [];
			}

			// Loop through aliases and organize them by type
			for(i = 0; i < aliases.length; i++) {
				let alias = aliases[i];
				// Make sure alias type exists
				if(aliasList[alias.type]) {
					aliasList[alias.type].push(alias);
				}
			}

			callback(null, aliasList);
		});
	});
}

/**
 * Returns a object containing aliases and their corresponding class object
 * @function mapAliases
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {mapAliasesCallback} callback - Callback
 */

/**
 * Returns an object containing Canvas and Portal aliases and their corresponding class objects
 * @callback mapAliasesCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} aliases - Two objects for Canvas and Portal aliases, which are also objects with key being alias and value being class object. If that makes any sense.
 */

function mapAliases(db, user, callback) {
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}
	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'), null);
		return;
	}

	asyncLib.parallel({
		aliases: asyncCallback => {
			listAliases(db, user, asyncCallback);
		},
		classes: asyncCallback => {
			classes.get(db, user, asyncCallback);
		}
	}, (err, results) => {
		let i;
		if(err) {
			callback(err, null);
			return;
		}

		let classMap = {};
		let aliasMap = {};

		// Organize classes by id
		for(i = 0; i < results.classes.length; i++) {
			let scheduleClass = results.classes[i];
			classMap[scheduleClass._id.toHexString()] = scheduleClass;
		}

		// Organize aliases by native class id
		for(i = 0; i < aliasTypes.length; i++) {
			let type = aliasTypes[i];
			aliasMap[type] = {};

			if(typeof results.aliases[type] !== 'object') continue;

			for(let j = 0; j < results.aliases[type].length; j++) {
				let aliasObject = results.aliases[type][j];
				aliasMap[type][aliasObject.classRemote] = classMap[aliasObject.classNative.toHexString()];
			}
		}

		callback(null, aliasMap);
	});
}

/**
 * Deletes an alias
 * @function deleteAlias
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {string} type - Valid alias type
 * @param {string} aliasId - ID of alias
 * @param {deleteAliasCallback} callback - Callback
 */

/**
 * Returns whether or not there was an error deleting the alias
 * @callback deleteAliasCallback
 * @param {Object} err - Null if success, error object if failure.
 */

function deleteAlias(db, user, type, aliasId, callback) {
	if(typeof callback !== 'function') {
		callback = () => {};
	}

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}
	if(!_.contains(aliasTypes, type)) {
		callback(new Error('Invalid alias type!'));
		return;
	}

	// Make sure valid alias
	listAliases(db, user, (err, aliases) => {
		if(err) {
			callback(err);
			return;
		}

		let validAliasId = null;
		for(let i = 0; i < aliases[type].length; i++) {
			let alias = aliases[type][i];
			if(aliasId === alias._id.toHexString()) {
				validAliasId = alias._id;
				break;
			}
		}

		if(!validAliasId) {
			callback(new Error('Invalid alias id!'));
			return;
		}

		let aliasdata = db.collection('aliases');

		aliasdata.deleteMany({ _id: validAliasId }, (err, results) => {
			if(err) {
				callback(new Error('There was a problem deleting the alias from the database!'));
				return;
			}

			callback(null);
		});
	});
}

/**
 * Check if given class has a portal alias
 * @function getAliasClass
 *
 * @param {Object} db - Database object
 * @param {string} user - Username
 * @param {string} type - Alias type
 * @param {string} classInput - Class to check for an alias
 * @param {getAliasClassCallback} callback - Callback
 */

/**
 * Returns the corresponding class object, or whatever was inputted if there was no alias.
 * @callback getAliasClassCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Boolean} hasAlias - Whether or not there is an alias for the specific string. Null if error.
 * @param {string} classObject - Class object if alias found, otherwise inputted class if none found. Null if error.
 */

function getAliasClass(db, user, type, classInput, callback) {
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}
	if(!_.contains(aliasTypes, type)) {
		callback(new Error('Invalid alias type!'));
		return;
	}
	// If class input is invalid, just return current value in case it is already a class object
	if(typeof classInput !== 'string') {
		callback(null, false, classInput);
		return;
	}

	// Make sure valid user
	users.get(db, user, (err, isUser, userDoc) => {
		if(err) {
			callback(err);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'));
			return;
		}

		let aliasdata = db.collection('aliases');

		aliasdata.find({ user: userDoc['_id'], type: type, classRemote: classInput }).toArray((err, aliases) => {
			if(err) {
				callback(new Error('There was a problem querying the database!'), null, null);
				return;
			}
			if(aliases.length === 0) {
				callback(null, false, classInput);
				return;
			}

			let classId = aliases[0].classNative;

			// Now get class object
			classes.get(db, user, (err, classes) => {
				if(err) {
					callback(err, null, null);
					return;
				}

				// Search user's classes for valid class id
				for(let i = 0; i < classes.length; i++) {
					let classObject = classes[i];

					if(classId.toHexString() === classObject._id.toHexString()) {
						callback(null, true, classObject);
						return;
					}
				}

				// There was no valid class
				callback(null, false, classInput);
			});
		});
	});
}

/**
 * Deletes all aliases that are not linked to any class
 * @function deleteClasslessAliases
 *
 * @param {Object} db - Databse connection
 * @param {deleteClasslessAliasesCallback} callback - Callback
 */

/**
 * Returns an error if any. Also has extremely long name.
 * @callback deleteClasslessAliasesCallback
 *
 * @param {Object} err - Null if success, error object if failure
 */

function deleteClasslessAliases(db, callback) {
	if(typeof callback !== 'function') {
		callback = () => {};
	}

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}

	let aliasdata = db.collection('aliases');
	let classdata = db.collection('classes');

	asyncLib.parallel({
		// Get aliases
		aliases: asyncCallback => {
			aliasdata.find({}).toArray((err, docs) => {
				if(err) {
					asyncCallback(new Error('There was a problem querying the database!'), null);
				} else {
					asyncCallback(null, docs);
				}
			});
		},
		// Get classes
		classes: asyncCallback => {
			classdata.find({}).toArray((err, docs) => {
				if(err) {
					asyncCallback(new Error('There was a problem querying the database!'), null);
				} else {
					asyncCallback(null, docs);
				}
			});
		}
	}, (err, results) => {
		if(err) {
			callback(err);
			return;
		}

		// Loop through aliases asynchronously
		function checkAlias(i) {
			if(i >= results.aliases.length) {
				// Done looping through classes
				callback(null);
				return;
			}

			let alias = results.aliases[i];

			let validClass = false;
			for(let j = 0; j < results.classes.length; j++) {
				let dbClass = results.classes[j];

				// Check if alias has a corresponding class id with the same user
				if(alias.classNative.toHexString() === dbClass._id.toHexString()) {
					validClass = true;
					break;
				}
			}

			// If there isn't a corresponding class with this alias, delete
			if(!validClass) {
				aliasdata.deleteMany({ _id: alias._id, user: alias.user }, (err, results) => {
					if(err) {
						callback(new Error('There was a problem deleting an alias in the database!'));
						return;
					}

					checkAlias(++i);
				});
			} else {
				checkAlias(++i);
			}
		}
		checkAlias(0);
	});
}

module.exports.add      = addAlias;
module.exports.list     = listAliases;
module.exports.mapList  = mapAliases;
module.exports.delete   = deleteAlias;
module.exports.getClass = getAliasClass;
module.exports.deleteClasslessAliases = deleteClasslessAliases;
