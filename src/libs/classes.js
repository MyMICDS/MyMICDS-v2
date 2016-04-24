/**
 * @file Functions for inserting class data
 * @module classes
 */

var config      = require(__dirname + '/requireConfig.js');
var MongoClient = require('mongodb').MongoClient;
var ObjectID    = require('mongodb').ObjectID;
var users       = require(__dirname + '/users.js');
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
    'other'
];

var validTeacherPrefixes = [
	'Mr.',
	'Ms.'
];

var validTypes = [
    'science',
    'art',
    'math',
    'wl', // World Language
    'english',
    'history',
    'other'
];

/**
 * Gets an array of all the classes under a certain user
 * @function getClasses
 * 
 * @param {string} user - Username to get classes under
 * @param {getClassesCallback} callback - Callback
 */

/**
 * Callback after all classes have been retrieved
 * @callback getClassesCallback
 * 
 * @param {Boolean} success - True if successful, false if error
 * @param {Object} classes - Array of classes
 */

function getClasses(user, callback) {
	if(user && typeof callback === 'function') {
		MongoClient.connect(config.mongodbURI, function(dbErr, db) {
			var userdata = db.collection('users');
			var classData = db.collection('classes');
			var teacherData = db.collection('teachers');

			// Get user id
			userdata.find({user: user}).toArray(function(userFindErr, userDocs) {
				if(!userFindErr && userDocs.length > 0) {
					var userId = userDocs[0]._id;
					// Get all classes
					classData.find({user: userId}).toArray(function(classFindErr, classDocs) {
						if(!classFindErr) {
							var classes = [];
							classDocs.forEach(function(singleClass, index) {
								// Find teacher
								teacherData.find({_id: singleClass.teacher}).toArray(function(teacherFindErr, teacherDocs) {
									singleClass.teacher = teacherDocs[0];
									classes.push(singleClass);

									// If all classes have been fetched, call callback
									if(classDocs.length === classes.length) {
										callback(true, classes);
									}
								});
							});
						} else {
							callback(false, null);
						}
					});
				} else {
					callback(false, null);
				}
			});
		});
	}
}

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
		scheduleClass.displayPlanner
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
            var userdata  = db.collection('users');
            var classData = db.collection('classes');
			
            if(!dbErr) {
				// Make sure valid username, if true, get the _id
                userdata.find({user: user}).toArray(function(userFindErr, userDocs) {
                    if(!userFindErr) {
                        if(userDocs.length > 0 && userDocs[0]['confirmed']) {
							
							// User is set, get their id to insert with the class
							var userId = userDocs[0]['_id'];
							
							// Add the teacher to database. If the class is a duplicate, there would also be duplicate teacher ids
							addTeacher(scheduleClass.teacherPrefix, scheduleClass.teacherFirstName, scheduleClass.teacherLastName, function(response, teacherId) {
								// Deletes all useless classes incase if edit teacher
								deleteUselessClasses();
								
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
 * Deletes a class, and teacher if nobody else has the same teacher
 * @function deleteClass
 * 
 * @param {string} user - Username
 * @param {string} classId - Class id
 * @param {deleteClassCallback}
 */

/**
 * Callback after deletes class
 * @callback deleteClassCallback
 * 
 * @param {Boolean} success - True if success, false if failure
 * @param {string} message - String giving a detailed response
 */

function deleteClass(user, id, callback) {
	if(typeof id === 'undefined') {
		callback(false, 'Invalid class id!');
		return;
	}
	MongoClient.connect(config.mongodbURI, function(dbErr, db) {
		if(!dbErr) {
			var classId   = new ObjectID.createFromHexString(id);
			var userdata  = db.collection('users');
            var classData = db.collection('classes');
			
			users.getUserId(user, function(userId) {
				classData.find({
					_id: classId,
					user: userId
				}).toArray(function(classFindError, classDocs) {
					if(!classFindError) {
						if(classDocs.length > 0) {
							var teacherId = classDocs[0]['teacher'];
							classData.deleteMany({
								_id: classId,
								user: userId
							}, function(err, results) {
								if(!err) {
									callback(true, 'Class deleted!');
								} else {
									callback(false, 'Error while deleting class in database!');
								}
							});
							deleteTeacher(teacherId);
						} else {
							callback(true, 'Class deleted!');
						}
					} else {
						callback(false, 'There was an error querying the database!');
					}
				});
			});
		} else {
			callback(false, 'There was an error connecting to the database!');
		}
	});
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
		lastName
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
 * Deletes a teacher if no other person has it
 * @function deleteTeacher
 * 
 * @param {Object} teacherId - Id of teacher
 * @param {deleteTeacherCallback} [callback] - Callback
 */

/**
 * Callback after deletes a teacher
 * @callback deleteTeacherCallback
 * 
 * @param {Boolean} success - True if success, false if error
 */

function deleteTeacher(teacherId, callback) {
	if(typeof teacherId === 'undefined') {
		if(typeof callback === 'function') {
			callback(false);
		}
		return;
	}
	MongoClient.connect(config.mongodbURI, function(dbErr, db) {
		if(!dbErr) {
			var classData   = db.collection('classes');
			var teacherData = db.collection('teachers');
			
			classData.find({ teacher: teacherId }).toArray(function(classFindError, classDocs) {
				if(!classFindError) {
					if(classDocs.length === 0) {
						// No classes with a teacher, delete
						teacherData.deleteMany({_id: teacherId}, function(err, results) {
							if(!err && typeof callback === 'function') {
								callback(true);
							} else if(typeof callback === 'function') {
								callback(false);
							}
						});
					} else if(typeof callback === 'function') {
						// Don't delete, other classes with same teacher
						callback(true);
					}
				} else if(typeof callback === 'function') {
					callback(false);
				}
			});
		} else if(typeof callback === 'function') {
			callback(false);
		}
	});
}

/**
 * Deletes all teachers that are not linked to any class
 * @function deleteUselessClasses
 */

function deleteUselessClasses() {
	MongoClient.connect(config.mongodbURI, function(dbErr, db) {
		if(!dbErr) {
			var teacherData = db.collection('teachers');
			teacherData.find({}).toArray(function(teacherErr, teacherDocs) {
				if(!teacherErr) {
					teacherDocs.forEach(function(value, index) {
						var teacherId = value['_id'];
						deleteTeacher(teacherId);
					});
				}
			});
		}
	});
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

module.exports.getClasses  = getClasses;
module.exports.addClass    = addClass;
module.exports.deleteClass = deleteClass;