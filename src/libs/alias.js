'use strict';

/**
 * @file Creates bridges between MyMICDS Native Planner System™ and Portal-Canvas
 * @module alias
 */

var _ 		 = require('underscore');
var ObjectID = require('mongodb').ObjectID;

/**
 * Aliases a portal class with a native class
 * @function addPortalAlias
 *
 * @param {Object} db - Database object
 * @param {string} classString - Portal class string
 * @param {string} classID - Native class ID
 * @param {addPortalAliasCallback} callback - Callback
 */

/**
 * Callback after alias is created
 * @callback addPortalAliasCallback
 *
 * @param {Object} err - Null if success, error object if failure
 */
function addPortalAlias(db, classString, classID, callback) {
	var aliases = db.collection("aliases");

	var insertData = {
		type: "portal",
		classNative: ObjectID(classID),
		classRemote: classString
	};

	aliases.insert(insertData, function(err, results) {
		if(err) {
			callback(new Error("There was an error inserting the alias record into the database!"));
			return;
		}

		callback(null);
	});
}

/**
 * Aliases a canvas class with a native class
 * @function addCanvasAlias
 *
 * @param {Object} db - Database object
 * @param {string} classString - Canvas class string
 * @param {string} classID - Native class ID
 * @param {addCanvasAliasCallback} callback - Callback
 */

/**
 * Callback after alias is created
 * @callback addCanvasAliasCallback
 *
 * @param {Object} err - Null if success, error object if failure
 */
function addCanvasAlias(db, classString, classID, callback) {
	var aliases = db.collection("aliases");

	var insertData = {
		type: "canvas",
		classNative: ObjectID(classID),
		classRemote: classString
	};

	aliases.insert(insertData, function(err, results) {
		if(err) {
			callback(new Error("There was an error inserting the alias record into the database!"));
			return;
		}

		callback(null);
	});
}

/**
 * Check if given class has a portal alias
 * @function getPortalAlias
 * 
 * @param {Object} db - Database object
 * @param {string} classInput - Class to check for an alias
 * @param {getPortalAliasCallback} callback - Callback
 */

/**
 * Callback after alias is checked
 * @callback getPortalAliasCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {string} classOutput - Class ID if alias found, inputted class if not found, null if failure
 */
function getPortalAlias(db, classInput, callback) {
	var aliases = db.collection("aliases");

	aliases.find({type: "portal", classRemote: classInput}).toArray(function(err, aliases) {
		if(err) {
			callback(new Error("There was an error searching for aliases!"), null);
		} else if(_.isEmpty(aliases)) {
			callback(null, classInput);
		} else {
			callback(null, aliases[0].classNative);
		}
	});
}

/**
 * Check if given class has a canvas alias
 * @function getCanvasAlias
 * 
 * @param {Object} db - Database object
 * @param {string} classInput - Class to check for an alias
 * @param {getCanvasAliasCallback} callback - Callback
 */

/**
 * Callback after alias is checked
 * @callback getCanvasAliasCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {string} classOutput - Class ID if alias found, inputted class if not found, null if failure
 */
function getCanvasAlias(db, classInput, callback) {
	var aliases = db.collection("aliases");

	aliases.find({type: "canvas", classRemote: classInput}).toArray(function(err, aliases) {
		if(err) {
			callback(new Error("There was an error searching for aliases!"), null);
		} else if(_.isEmpty(aliases)) {
			callback(null, classInput);
		} else {
			callback(null, aliases[0].classNative);
		}
	});
}