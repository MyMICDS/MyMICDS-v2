'use strict';

/**
 * @file Manages information and functions regarding the MyMICDS admins
 * @module admins
 */


/**
 * Gets usernames of admins from database
 * @function getAdmins
 * 
 * @param {Object} db - Database connection
 * @param {getAdminsCallback} callback - Callback
 */

/**
 * Callback after admins are retrieved
 * @callback getAdminsCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Array} adminList - Array of admin usernames if success, null if failure
 */
 function getAdmins(db, callback) {
 	if(typeof callback !== 'function') {
		callback = function() {};
	}

	var userscoll = db.collection('users');

	userscoll.find({scopes: ['admin']}).toArray(function(err, docs) {
		if(err) {
			callback(new Error('There was a problem querying the database!'), null);
			return;
		}

		var adminList = [];

		docs.forEach(function(userDoc) {
			adminList.push(userDoc['user'])
		});

		callback(null, adminList);
	});
 }