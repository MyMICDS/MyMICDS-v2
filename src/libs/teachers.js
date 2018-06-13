'use strict';

/**
 * @file Functions for managing teachers
 * @module teachers
 */
const _ = require('underscore');

const validTeacherPrefixes = [
	'Mr.',
	'Ms.'
];

/**
 * Adds a teacher into the database, as long as it isn't a duplicate
 * @function addTeacher
 *
 * @param {Object} db - Database connection
 * @param {Object} teacher - Object containing information about the teacher
 * @param {string} teacher.prefix - Either 'Mr.' or 'Ms.'
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

async function addTeacher(db, teacher) {
	if (typeof db !== 'object') throw new Error('Invalid database connection!');
	if (typeof teacher !== 'object') throw new Error('Invalid teacher object!');
	if (!_.contains(validTeacherPrefixes, teacher.prefix)) throw new Error('Invalid teacher prefix!');
	if (typeof teacher.firstName !== 'string') throw new Error('Invalid teacher first name!');
	if (typeof teacher.lastName !== 'string') throw new Error('Invalid teacher last name!');

	const teacherdata = db.collection('teachers');

	try {
		// Upsert teacher into collection
		await teacherdata.updateOne(teacher, teacher, { upsert: true });
	} catch (e) {
		throw new Error('There was a problem inserting the teacher into the database!');
	}

	try {
		const docs = await teacherdata.find(teacher).toArray();
		return docs[0];
	} catch (e) {
		throw new Error('There was a problem querying the database!');
	}
}

/**
 * Retrieves the document with the specified teacher id
 * @function getTeacher
 *
 * @param {Object} db - Database connection
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

async function getTeacher(db, teacherId) {
	if (typeof db !== 'object') throw new Error('Invalid database connection!');
	if (typeof teacherId !== 'object') throw new Error('Invalid teacher id object!');

	const teacherdata = db.collection('teachers');

	try {
		// Query database to find possible teacher
		const docs = await teacherdata.find({ _id: teacherId }).toArray();

		let isTeacher = false;
		let teacher = null;

		if (docs.length !== 0) {
			isTeacher = true;
			teacher = docs[0];
		}

		return { isTeacher, teacher };
	} catch (e) {
		throw new Error('There was a problem querying the database!');
	}
}

/**
 * Returns an array of all teachers in database for Typeahead
 * @function listTeachers
 *
 * @param {Object} db - Database connection
 * @param {listTeachersCallback} callback - Callback
 */

/**
 * Returns array of teachers
 * @callback listTeachersCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} teachers - Array of teacher objects. Null if error.
 */

async function listTeachers(db) {
	if (typeof db !== 'object') throw new Error('Invalid database connection!');

	const teacherdata = db.collection('teachers');

	try {
		return teacherdata.find({}).toArray();
	} catch (e) {
		throw new Error('There was a problem querying the database!');
	}
}

/**
 * Deletes a teacher if no other person has it
 * @function deleteTeacher
 *
 * @param {Object} db - Database connection
 * @param {Object} teacherId - Id of teacher
 * @param {deleteTeacherCallback} [callback] - Callback
 */

/**
 * Callback after deletes a teacher
 * @callback deleteTeacherCallback
 *
 * @param {Object} err - Null if success, error object if failure
 */

async function deleteTeacher(db, teacherId) {
	if (typeof db !== 'object') throw new Error('Invalid database connection!');
	if (typeof teacherId !== 'object') throw new Error('Invalid teacher id object!');

	// Don't delete teacher if there are classes it teaches!
	const classes = await teacherTeaches(db, teacherId);

	if (classes.length === 0) {
		// Teacher doesn't have any classes. Delete.
		const teacherdata = db.collection('teachers');

		try {
			await teacherdata.deleteOne({ _id: teacherId });
		} catch {
			throw new Error('There was a problem deleting the teacher from the database!');
		}
	}
}

/**
 * Determines whether any classes are using a teacher with a given id.
 * @function teacherTeaches
 *
 * @param {Object} db - Database connection
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

async function teacherTeaches(db, teacherId) {
	if (typeof db !== 'object') throw new Error('Invalid database connection!');
	if (typeof teacherId !== 'object') throw new Error('Invalid teacher id object!');

	const classdata = db.collection('classes');

	try {
		return classdata.find({ teacher: teacherId }).toArray();
	} catch (e) {
		throw new Error('There was a problem querying the database!');
	}
}

/**
 * Deletes all teachers that are not linked to any class
 * @function deleteClasslessTeachers
 *
 * @param {Object} db - Databse connection
 * @param {deleteClasslessTeachersCallback} callback - Callback
 */

/**
 * Returns an error if any. Also has extremely long name.
 * @callback deleteClasslessTeachersCallback
 *
 * @param {Object} err - Null if success, error object if failure
 */

async function deleteClasslessTeachers(db) {
	if (typeof db !== 'object') throw ew Error('Invalid database connection!');

	const teacherdata = db.collection('teachers');

	let docs;

	try {
		// Find all teachers
		docs = await teacherdata.find({}).toArray();
	} catch {
		throw new Error('There was a problem querying the database!');
	}

	await Promise.all(docs.map(doc => deleteTeacher(db, doc._id)));
}

module.exports.add = addTeacher;
module.exports.get = getTeacher;
module.exports.list = listTeachers;
module.exports.deleteClasslessTeachers = deleteClasslessTeachers;
