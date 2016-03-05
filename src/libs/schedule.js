/**
 * @file Functions for inserting class and schedule data
 * @module schedule
 */

var config      = require(__dirname + '/requireConfig.js');
var MongoClient = require('mongodb').MongoClient;
var ObjectID    = require('mongodb').ObjectID;
var utils       = require(__dirname + '/utils.js');

var validBlocks = [
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

var validTypes = [
    'science',
    'art',
    'math',
    'wl', // World Language
    'english',
    'history',
    'other',
];

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
 * @param {string} scheduleClass.color - Hex value of class color. Please include hash ('#') symbol.
 * @param {string} scheduleClass.type - Type of class ('science', 'art', 'math', 'wl', 'english', 'history', or 'other')
 * @param {Boolean} scheduleClass.displayPlanner - Whether to display the class on the planner
 * 
 * @param {addClassCallback} [callback] - Optional callback
 */

/**
 * What to do after it adds a class into the database
 * @callback addClassCallback
 * 
 * @param {Number|string} id - Id of class inserted, string if error
 */

function addClass(user, scheduleClass, callback) {
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
    
    
    // Check that all inputs are valid
	var dataIsSet = utils.dataIsSet(required);
    if(!utils.inArray(scheduleClass.block, validBlocks) || !utils.inArray(scheduleClass.type, validTypes)) {
        dataIsSet = false;
    }
    
    // Tests for valid Hex color (#XXX or #XXXXXX)
    var validColor = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(scheduleClass.color);
    if(!validColor) {
        dataIsSet = false;
    }
    
    if(dataIsSet) {
        // Generate unique id
        var objectID = new ObjectID();
        var id = objectID.toHexString();
        
        MongoClient.connect(config.mongodbURI, function(dbErr, db) {
            var userdata = db.collection('users');
            
            if(!dbErr) {
                userdata.find({user: user}).toArray(function(queryErr, docs) {
                    if(!queryErr) {
                        if(docs.length > 0) {
                            var insertClass =
                            {
                                id     : id,
                                name   : scheduleClass.name,
                                teacher: scheduleClass.teacher,
                                block  : scheduleClass.block,
                                color  : scheduleClass.color,
                                type   : scheduleClass.type,
                                displayPlanner: scheduleClass.displayPlanner,
                            };
                            var classes = docs[0]['classes'];

                            if(!checkDupClass(insertClass, classes)) {
                                userdata.update({user: user}, { $addToSet: { classes: insertClass }}, {upsert: true}, function(err, data) {
                                    if(!err) {
                                        callback(true);
                                    } else {
                                        callback('There was an error inserting the class(es) into the database!');
                                    }
                                }); 
                            } else {
                                callback('Tried to insert a duplicate class!');
                            }

                        } else {
                            callback('User doesn\'t exist!');
                        }
                    } else {
                        callback('There was an error inserting the class(es) into the database!');
                    }
                });
            } else {
                callback('There was an error connecting to the database!');
            }
        });
    } else {
        callback('Not all data is properly filled out!');
    }
}

/**
 * Checks for any duplicate classes in existing array. Returns true if duplicate class.
 * @function checkDupClass
 * 
 * @param {Object} needle - Class to check for duplicate, any extra values inside the object will be ignored
 * @param {string} needle.name - Name of class
 * @param {string} needle.teacher - Name of teacher
 * @param {string} needle.block - Which block the class takes place
 * @param {string} needle.color - Hex value of class color. Please include hash ('#') symbol.
 * @param {string} needle.type - Type of class ('science', 'art', 'math', 'wl', 'english', 'history', or 'other')
 
 * @param {Object} haystack - Array of existing classes, has the same values as the needle
 * 
 * @returns {Boolean}
 */

function checkDupClass(needle, haystack) {
    var dup = false;
    
    haystack.forEach(function(element) {
        console.log(element);
        if(needle.name === element.name && needle.teacher === element.teacher && needle.block === element.block && needle.color === element.color && needle.type === element.type) {
            dup = true;
        }
    });
    return dup;
}

module.exports.validBlocks = validBlocks;
module.exports.validTypes  = validTypes;

module.exports.addClass    = addClass;