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

var validTeacherPrefixes = [
	'Mr.',
	'Ms.',
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
 * @param {string} scheduleClass.teacherPrefix - Either 'Mr.' or 'Ms.'
 * @param {string} scheduleClass.teacherFirstName - First name of teacher
 * @param {string} scheduleClass.teacherLastName - Last name of teacher
 * @param {string} scheduleClass.block - Which block the class takes place
 * @param {string} scheduleClass.color - Hex value of class color. Please include hash ('#') symbol.
 * @param {string} scheduleClass.type - Type of class ('science', 'art', 'math', 'wl', 'english', 'history', or 'other')
 * @param {Boolean} scheduleClass.displayPlanner - Whether to display the class on the planner
 * 
 * @param {addClassCallback} callback - Callback
 * @param {string} [editId] - Optional id to insert class under
 */

/**
 * What to do after it adds a class into the database
 * @callback addClassCallback
 * 
 * @param {Boolean} success - True if success, false if failure
 * @param {Number|string} editId - Id of class inserted, string if error
 */

function addClass(user, scheduleClass, callback, editId) {
	// Checks that all required parameters are there
    var required = [
        user,
        scheduleClass.name,
		scheduleClass.teacherPrefix,
		scheduleClass.teacherFirstName,
		scheduleClass.teacherLastName,
		scheduleClass.block,
		scheduleClass.color,
		scheduleClass.type,
		scheduleClass.displayPlanner,
    ];
    
    
    // Check that all inputs are valid
	var dataIsSet = utils.dataIsSet(required) && utils.notNull(required);
	
    if(!utils.inArray(scheduleClass.block, validBlocks) || !utils.inArray(scheduleClass.teacherPrefix, validTeacherPrefixes) || !utils.inArray(scheduleClass.type, validTypes)) {
        dataIsSet = false;
    }
    
    // Tests for valid Hex color (#XXX or #XXXXXX)
    var validColor = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(scheduleClass.color);
    if(!validColor) {
        dataIsSet = false;
    }
	
    if(dataIsSet) {
        
        MongoClient.connect(config.mongodbURI, function(dbErr, db) {
            var userdata    = db.collection('users');
            var classData   = db.collection('classes');
			
            if(!dbErr) {
				// Make sure valid username, if true, get the _id
                userdata.find({user: user}).toArray(function(userFindErr, userDocs) {
                    if(!userFindErr) {
                        if(userDocs.length > 0 && userDocs[0]['confirmed']) {
							
							// User is set, get their id to insert with the class
							var userId = userDocs[0]['_id'];
							
							// Add the teacher to database. If the class is a duplicate, there would also be duplicate teacher ids
							addTeacher(scheduleClass.teacherPrefix, scheduleClass.teacherFirstName, scheduleClass.teacherLastName, function(response, teacherId) {
								if(response) {
									var insertClass =
									{
										user: userId,
										name: scheduleClass.name,
										teacher: teacherId,
										block: scheduleClass.block,
										color: scheduleClass.color,
										type : scheduleClass.type,
										displayPlanner: scheduleClass.displayPlanner,
									};

									// Get classes to check for duplicates
									classData.find({user: userId}).toArray(function(classFindErr, classDocs) {
										if(!classFindErr) {

											var classes = classDocs;
											
											// Lets see if we are supposed to edit one of those
											if(checkDupId(editId, classes)) {
												console.log('duplicate id! edit!');
												var id = new ObjectID.createFromHexString(editId);
											} else {
												// Either id doesn't exist or we've been given an invalid id. Generate a new one.
												var id = new ObjectID();
											}
											
											// Check for duplicate classes
											var dupClasses = checkDupClass(insertClass, classes);
											
											if(dupClasses.length === 0) {
												
												classData.update({ _id: id }, insertClass, { upsert: true }, function(updateErr, data) {
													if(!updateErr) {
														callback(true, id);
													} else {
														callback(false, 'There was an error inserting the class(es) into the database!');
													}
												}); 
											} else {
												// If editId was set, that means someone was trying to edit a class. Don't give an error if you are editting class as the same thing
												if(!utils.inArray(id.toHexString(), dupClasses)) {
													callback(false, 'Tried to insert a duplicate class!');
												} else {
													callback(true, id);
												}
											}
										} else {
											callback(false, 'There was an error inserting the class(es) into the database!')
										}
									});
								} else {
									// Teacher id will have an error message if error
									callback(false, teacherId);
								}
							});
                        } else if(userDocs.length === 0) {
                            callback(false, 'User doesn\'t exist!');
                        } else {
							callback(false, 'User\'s account isn\'t authenticated!')
						}
                    } else {
                        callback(false, 'There was an error inserting the class(es) into the database!');
                    }
                });
            } else {
                callback(false, 'There was an error connecting to the database!');
            }
        });
    } else {
        callback(false, 'Not all data is properly filled out!');
    }
}

/**
 * Adds a teacher into the database, as long as it isn't a duplicate
 * @function addTeacher
 * 
 * @param {string} teacherPrefix - Either 'Mr.' or 'Ms.'
 * @param {string} firstName - Teacher's first name
 * @param {string} lastName - Teacher's last name
 * @param {addTeacherCallback} callback
 */

/**
 * Callback after a teacher is added to the database
 * @callback addTeacherCallback
 * 
 * @param {Boolean} response - True if successful, false if not
 * @param {Object} teacherId - Id of the teacher added, or error message if failure
 */

function addTeacher(prefix, firstName, lastName, callback) {
	var required = [
		prefix,
		firstName,
		lastName,
	];
	
	if(utils.dataIsSet(required) && utils.notNull(required)) {
		MongoClient.connect(config.mongodbURI, function(dbErr, db) {
			if(!dbErr) {
				var teacherData = db.collection('teachers');
				teacherData.update({ prefix: prefix, firstName: firstName, lastName: lastName }, { $set: {
					
					prefix   : prefix,
					firstName: firstName,
					lastName : lastName,
					
				}}, { upsert: true }, function(updateError, results) {
					if(!updateError) {
						teacherData.find({ prefix: prefix, firstName: firstName, lastName: lastName }).toArray(function(findError, docs) {
							if(!findError) {
								var id = docs[0]['_id'];
								callback(true, id);
							} else {
								callback(false, 'There was an error querying the teacher from the database!');
							}
						});
					} else {
						callback(false, 'There was an error inserting the teacher into the database!');
					}
				});
			} else {
				callback(false, 'There was an error connecting to the database!');
			}
		});
	} else {
		callback(false, 'Not all teacher data is set!');
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
 * @returns {Object} dupIds - Array of id's that are marked as duplicate
 */

function checkDupClass(needle, haystack) {
	
    var dup = [];
	
	if(!haystack || haystack.length === 0) {
		return dup;
	}
    
    for(var i = 0; i < haystack.length; i++) {
		var element = haystack[i];
		
        if(needle.name === element.name && needle.teacher.toHexString() === element.teacher.toHexString() && needle.block === element.block && needle.color === element.color && needle.type === element.type) {
            dup.push(element._id.toHexString());
        }
    }
    return dup;
}

/**
 * Check if an id exists within an array of classes
 * @function checkDupId
 * 
 * @param {string} needle - Id to look for
 * @param {Object} haystack - Array of objects to scan id for
 * @param {string} haystack._id - Id to check if duplicate
 * 
 * @returns {Boolean} response - True if duplicate, false if id doesn't exist in classes
 */

function checkDupId(needle, haystack) {
	var idArray = [];
	if(haystack.length > 0) {
		
		// Put all ids in classes into array
		for(var i = 0; i < haystack.length; i++) {
			idArray.push(haystack[i]['_id'].toHexString());
		}
		
		return utils.inArray(needle, idArray);
	} else {
		return false;
	}
}

module.exports.validBlocks = validBlocks;
module.exports.validTypes  = validTypes;

module.exports.addClass    = addClass;