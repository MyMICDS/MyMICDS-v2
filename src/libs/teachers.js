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
 * @param {Object} teacher - Object containing information about the teacher
 * @param {string} teacher.prefix - Either 'Mr.', 'Ms.', or 'Dr.'
 * @param {string} teacher.firstName - Teacher's first name
 * @param {string} teacher.lastName - Teacher's last name
 * @param {addTeacherCallback} callback - Callback
 */

/**
 * Callback after a teacher is added to the database
 * @callback addTeacherCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Object} teacher - Returns the document of the teacher we just added. Null if error
 */

function addTeacher(teacher, callback) {

    if(typeof callback !== 'function') {
        callback = function() {};
    }

    if(typeof teacher !== 'object') {
        callback(new Error('Invalid teacher object!'), null);
        return;
    }
    if(!_.contains(validTeacherPrefixes, teacher.prefix)) {
        callback(new Error('Invalid teacher prefix!'), null);
        return;
    }
    if(typeof teacher.firstName !== 'string') {
        callback(new Error('Invalid teacher first name!'), null);
        return;
    }
    if(typeof teacher.lastName !== 'string') {
        callback(new Error('Invalid teacher last name!'), null);
        return;
    }

    // Connect to database
	MongoClient.connect(config.mongodbURI, function(err, db) {

        if(err) {
            callback(new Error('There was a problem connecting to the database!'), null);
            return;
        }

		var teacherdata = db.collection('teachers');
        // Upsert teacher into collection
		teacherdata.update({ prefix: prefix, firstName: firstName, lastName: lastName }, { $set: {

			prefix   : prefix,
			firstName: firstName,
			lastName : lastName,

		}}, { upsert: true }, function(err, results) {

            if(err) {
                callback(new Error('There was a problem inserting the teacher into the database!'), null);
                return;
            }

            // Get document of teacher we just added
            teacherdata.find({ prefix: prefix, firstName: firstName, lastName: lastName }).toArray(function(err, docs) {
                if(err) {
                    callback(new Error('There was a problem querying the database!'), null);
                    return;
                }

                callback(null, docs[0]);

            });
		});
	});
}

/**
 * Retrieves the document with the specified teacher id
 * @function getTeacher
 *
 * @param {Object} teacherId - Object id of teacher
 * @param {getTeacherCallback} callback - Callback
 */

 /**
  * Returns the document of teacher
  * @callback getTeacherCallback
  *
  * @param {Object} err - Null if success, error object if failure
  * @param {Boolean} isTeacher - True if there is a valid teacher, false if not. Null if error.
  * @param {Object} teacher - Teacher document. Null if error or no valid teacher.
  */

  function getTeacher(teacherId, callback) {
      if(typeof callback !== 'function') return;

      if(typeof teacherId !== 'object') {
          callback(new Error('Invalid teacher id object!'), null, null);
          return;
      }

      // Connect to database
      MongoClient.connect(config.mongodbURI, function(err, db) {

          if(err) {
              callback(new Error('There was a problem connecting to the database!'), null, null);
              return;
          }

          var teacherdata  = db.collection('teacher');
          // Query database to find possible teacher
          userdata.find({ _id: teacherId }).toArray(function(err, docs) {
              db.close();

              if(err) {
                  callback(new Error('There was a problem querying the database!'), null, null);
                  return;
              }

              if(docs.length === 0) {
                  callback(null, false, null)
              } else {
                  callback(null, true, docs[0]);
              }

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
 * @param {Object} err - Null if success, error object if failure
 */

function deleteTeacher(teacherId, callback) {

    if(typeof callback !== 'function') {
        callback = function() {};
    }

    if(typeof teacherId !== 'object') {
        callback(new Error('Invalid teacher id object!'));
    }

	MongoClient.connect(config.mongodbURI, function(err, db) {

        if(err) {
            callback(new Error('There was a problem connecting to the database!'));
            return;
        }

        // Don't delete teacher if there are classes it teaches!
		teacherTeaches(teacherId, function(err, classes) {
            if(err) {
                callback(err);
                return;
            }

            if(classes === []) {
                // Teacher doesn't have any classes. Delete.
                classdata.deleteMany({ _id: teacherId }, function(err, results) {
                    db.close();

                    if(err) {
                        callback(new Error('There was a problem deleting the teacher from the database!'));
                        return;
                    }

                    callback(null);

                });
            } else {
                // Teacher has other classes. Don't delete!
                db.close();
                callback(null);
            }
        });
	});
}

/**
 * Determines whether any classes are using a teacher with a given id.
 * @function teacherTeaches
 *
 * @param {Object} teacherId - Id of teacher to Check
 * @param {teacherTeachesCallback} callback - Callback
 */

 /**
  * Returns an array of classes a teacher teaches
  * @callback teacherTeachesCallback
  *
  * @param {Object} err - Null if success, error object if failure
  * @param {Object} classes - Array of classes the teacher teaches. Empty array if teacher doesn't teach anything. Null if error.
  */

function teacherTeaches(teacherId, callback) {
    if(typeof callback !== 'function') return;

    if(typeof teacherId !== 'object') {
        callback(new Error('Invalid teacher id object!'), null);
        return;
    }

    MongoClient.connect(config.mongodbURI, function(err, db) {
        if(err) {
            callback(new Error('There was a problem connecting to the database!'), null);
            return;
        }

        var classdata = db.collection('classes');

        classdata.find({ teacher: teacherId }).toArray(function(err, docs) {
            if(err) {
                callback(new Error('There was a problem querying the database!'), null);
                return;
            }

            callback(null, docs);

        });
    });
}

/**
 * Deletes all teachers that are not linked to any class
 * @function deleteClasslessTeachers
 *
 * @param {deleteClasslessTeachersCallback} callback - Callback
 */

 /**
  * Returns an error if any. Also has extremely long name.
  * @callback deleteClasslessTeachersCallback
  *
  * @param {Object} err - Null if success, error object if failure
  */

function deleteClasslessTeachers(callback) {

    if(typeof callback !== 'function') {
        callback = function() {};
    }

	MongoClient.connect(config.mongodbURI, function(err, db) {

        if(err) {
            callback(new Error('There was a problem connecting to the database!'));
            return;
        }

		var teacherdata = db.collection('teachers');
        // Find all teachers
		teacherData.find({}).toArray(function(err, docs) {
            db.close();

            if(err) {
                callback(new Error('There was a problem querying the database!'));
                return;
            }

            // This delete function uses the power recursion so we can asynchronously delete teachers and provide a callback in the end
            function deleteTeachers(i) {
                if(i < docs.length) {
                    var teacherId = docs[i]['_id'];
                    deleteTeacher(teacherId, function(err) {
                        if(err) {
                            callback(err);
                            return;
                        }

                        deleteTeachers(i++);
                    });
                } else {
                    // It's done iterating over the teachers, and there's no error!
                    callback(null);
                }
            }
            deleteTeachers(0);
		});
	});
}

module.exports.addTeacher = addTeacher;
module.exports.getTeacher = getTeacher;
module.exports.deleteClasslessTeachers = deleteClasslessTeachers;
