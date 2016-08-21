'use strict';

/**
 * @file Creates bridges between MyMICDS Native Planner System™ and Portal-Canvas
 * @module alias
 */

var _ 		 = require('underscore');
var classes  = require(__dirname + '/classes.js');
var ObjectID = require('mongodb').ObjectID;
var users    = require(__dirname + '/users.js');

// Types of aliases
var aliasTypes = [
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
		callback = function() {};
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
	users.get(db, user, function(err, isUser, userDoc) {
		if(err) {
			callback(err, null);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'), null);
			return;
		}

		// Check if alias already exists
		getAliasClass(db, user, type, classString, function(err, hasAlias, classObject) {
			if(err) {
				callback(err, null);
				return;
			}
			if(hasAlias) {
				callback(new Error('Alias already exists for a class!'), null);
				return;
			}

			// Make sure class id is valid
			classes.get(db, user, function(err, classes) {
				if(err) {
					callback(err, null);
					return;
				}

				// Loop through classes and search for class with id specified
				var validClassObject = null;
				for(var i = 0; i < classes.length; i++) {
					var classObject = classes[i];

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
				var insertAlias = {
					user: userDoc['_id'],
					type: type,
					classNative: validClassObject._id,
					classRemote: classString
				};

				// Insert into database
				var aliasdata = db.collection('aliases');

				aliasdata.insert(insertAlias, function(err, results) {
					if(err) {
						callback(new Error('There was a problem inserting the alias into the databse!'), null);
						return;
					}

					var insertedId = results.ops[0]._id;
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
	users.get(db, user, function(err, isUser, userDoc) {
		if(err) {
			callback(err, null);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'), null);
			return;
		}

		// Query database for all aliases under specific user
		var aliasdata = db.collection('aliases');
		aliasdata.find({ user: userDoc['_id'] }).toArray(function(err, aliases) {
			if(err) {
				callback(new Error('There was a problem querying the database!'), null);
				return;
			}

			var aliasList = {};

			// Add array for all alias types
			for(var i = 0; i < aliasTypes.length; i++) {
				var aliasType = aliasTypes[i]
				aliasList[aliasType] = [];
			}

			// Loop through aliases and organize them by type
			for(var i = 0; i < aliases.length; i++) {
				var alias = aliases[i];
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
		callback = function() {};
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
	listAliases(db, user, function(err, aliases) {
		if(err) {
			callback(err);
			return;
		}

		var validAliasId = null;
		for(var i = 0; i < aliases[type].length; i++) {
			var alias = aliases[type][i];
			if(aliasId === alias._id.toHexString()) {
				validAliasId = alias._id;
				break;
			}
		}

		if(!validAliasId) {
			callback(new Error('Invalid alias id!'));
			return;
		}

		var aliasdata = db.collection('aliases');

		aliasdata.deleteMany({ _id: validAliasId }, function(err, results) {
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
	users.get(db, user, function(err, isUser, userDoc) {
		if(err) {
			callback(err);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'));
			return;
		}

		var aliasdata = db.collection('aliases');

		aliasdata.find({ user: userDoc['_id'], type: type, classRemote: classInput }).toArray(function(err, aliases) {
			if(err) {
				callback(new Error('There was a problem querying the database!'), null, null);
				return;
			}
			if(aliases.length === 0) {
				callback(null, false, classInput);
				return;
			}

			var classId = aliases[0].classNative;

			// Now get class object
			classes.get(db, user, function(err, classes) {
				if(err) {
					callback(err, null, null);
					return;
				}

				// Search user's classes for valid class id
				for(var i = 0; i < classes.length; i++) {
					var classObject = classes[i];

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

module.exports.add = addAlias;
module.exports.list = listAliases;
module.exports.delete = deleteAlias;
module.exports.getClass = getAliasClass;
