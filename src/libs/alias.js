'use strict';

/**
 * @file Creates bridges between MyMICDS Native Planner System™ and Portal-Canvas
 * @module alias
 */

var ObjectID   = require('mongodb').ObjectID;

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