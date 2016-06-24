/**
 * @file Functions for managing teachers
 * @module teachers
 */

 var config = require(__dirname + '/config.js');

 var _           = require('underscore');
 var MongoClient = require('mongodb').MongoClient;

var validTeacherPrefixes = [
	'Mr.',
	'Ms.',
	'Dr.'
];

/**
 * Adds a teacher into the database, as long as it isn't a duplicate
 * @function addTeacher
 *
 * @param {string} teacherPrefix - Either 'Mr.', 'Ms.', or 'Dr.'
 * @param {string} firstName - Teacher's first name
 * @param {string} lastName - Teacher's last name
 * @param {addTeacherCallback} callback - Callback
 */

/**
 * Callback after a teacher is added to the database
 * @callback addTeacherCallback
 *
 * @param {Object} err - Null if success, error object if failure
 */

function addTeacher(prefix, firstName, lastName, callback) {

    if(typeof callback !== 'function') {
        callback = function() {};
    }

    if(typeof prefix !== 'string' || !_.contains(validTeacherPrefixes, prefix)) {
        callback(new Error('Invalid teacher prefix!'));
        return;
    }

    // Connect to database
	MongoClient.connect(config.mongodbURI, function(err, db) {

        if(err) {
            callback(new Error('There was a problem connecting to the database!'));
            return;
        }

		var teacherData = db.collection('teachers');
        // Upsert teacher into collection
		teacherData.update({ prefix: prefix, firstName: firstName, lastName: lastName }, { $set: {

			prefix   : prefix,
			firstName: firstName,
			lastName : lastName,

		}}, { upsert: true }, function(err, results) {

            if(err) {
                callback(new Error('There was a problem inserting the teacher into the database!'));
                return;
            }

            callback(null);
		});
	});
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

module.exports.addTeacher = addTeacher;
