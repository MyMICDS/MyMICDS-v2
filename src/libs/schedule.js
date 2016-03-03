/**
 * @file Functions for inserting class and schedule data
 * @module schedule
 */

var config      = require(__dirname + '/requireConfig.js');
var MongoClient = require('mongodb').MongoClient;
var utils       = require(__dirname + '/utils.js');

/**
 * Add a class to the database
 * @function addClass
 * 
 * @param {string} user - Username to insert the class under
 * 
 * @param {Object} scheduleClass - JSON of class to add
 * @param {string} scheduleClass.name - Name of class
 * @param {string} scheduleClass.teacher - Name of teacher
 * @param {string} scheduleClass.block - Which block the class takes place
 * @param {string} scheduleClass.color - Hex value of class color
 * @param {string} scheduleClass.type - Type of class ('science', 'art', 'math', 'wl', 'english', 'history', or 'other')
 * @param {Boolean} scheduleClass.displayPlanner - Whether to display the class on the planner
 * 
 * @param {addClassCallback} [callback] - Optional callback
 */

/**
 * What to do after it adds a class into the database
 * @callback addClassCallback
 * 
 * @param {Number|Boolean} id - Id of class inserted, false if error
 */

function addClass(user, scheduleClass, callback) {
	
	var block = [
		'a',
		'b',
		'c',
		'd',
		'e',
		'f',
		'g',
		'advisory',
		'activities',
		'collaborative',
		'community',
		'enrichment',
		'flex',
		'freePeriod',
		'lunch',
		'macTime',
		'pe',
		'recess',
		'sport',
		'studyHall',
		'other',
	];
	
	var type = [
		'science',
		'art',
		'math',
		'wl', // World Language
		'english',
		'history',
		'other',
	];
	
	// Checks that all required parameters are there
    
    var required = [
        user,
        scheduleClass.name,
		scheduleClass.teacher,
		scheduleClass.block,
		scheduleClass.color,
		scheduleClass.type,
		scheduleClass.displayPlanner,
    ];
	
	var dataIsSet = utils.dataIsSet(required);
	
	MongoClient.connect(config.mongodbURI, function(err, db) {
		var userdata = db.collection('users');
	});
}