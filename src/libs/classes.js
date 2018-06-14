'use strict';

/**
 * @file Functions for inserting class data
 * @module classes
 */
const _ = require('underscore');
const aliases = require(__dirname + '/aliases.js');
const ObjectID = require('mongodb').ObjectID;
const prisma = require('prisma');
const teachers = require(__dirname + '/teachers.js');
const users = require(__dirname + '/users.js');

const Random = require('random-js');
const engine = Random.engines.mt19937().autoSeed();

const validBlocks = [
	'a',
	'b',
	'c',
	'd',
	'e',
	'f',
	'g',
	'sport',
	'other'
];

const validTypes = [
	'art',
	'english',
	'history',
	'math',
	'science',
	'spanish',
	'latin',
	'mandarin',
	'german',
	'french',
	'other'
];

// RegEx to test if string is a valid hex color ('#XXX' or '#XXXXXX')
const validColor = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i;

/**
 * Inserts/updates a class to the database
 * @function upsertClass
 *
 * @param {Object} db - Databse connection
 * @param {string} user - Username to insert the class under
 *
 * @param {Object} scheduleClass - JSON of class to add
 * @param {string} [scheduleClass._id] - Id to modify class under (Optional)
 * @param {string} scheduleClass.name - Name of class
 * @param {string} [scheduleClass.color] - Hex value of class color. Please include hash ('#') symbol. (Optional, default random color)
 * @param {string} [scheduleClass.block] - Which block the class takes place (Optional. Default to 'other')
 * @param {string} [scheduleClass.type] - Type of class (Optional, default to 'other')
 *
 * @param {Object} scheduleClass.teacher - Information about teacher
 * @param {string} scheduleClass.teacher.prefix - Either 'Mr.' or 'Ms.'
 * @param {string} scheduleClass.teacher.firstName - First name of teacher
 * @param {string} scheduleClass.teacher.lastName - Last name of teacher
 *
 * @callback {upsertClassCallback} callback - Callback
 */

/**
 * What to do after it adds a class into the database
 * @callback upsertClassCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Object} scheduleClass - Object of class inserted
 */

async function upsertClass(db, user, scheduleClass) {
	// Input validation best validation
	if (typeof db !== 'object') throw new Error('Invalid database connection!');
	if (typeof scheduleClass._id !== 'string') scheduleClass._id = '';

	if (typeof user               !== 'string') throw new Error('Invalid username!');
	if (typeof scheduleClass      !== 'object') throw new Error('Invalid class object!');
	if (typeof scheduleClass.name !== 'string') throw new Error('Invalid class name!');

	// If no valid block or type, default to 'other'
	if (!_.contains(validBlocks, scheduleClass.block)) scheduleClass.block = 'other';
	if (!_.contains(validTypes, scheduleClass.type))   scheduleClass.type  = 'other';
	// If not valid color, generate random
	if (!validColor.test(scheduleClass.color)) {
		// You think we're playing around here? No. This is MyMICDS.
		// We are going to cryptographically generate a color as random as human intelligence can get us.
		scheduleClass.color = '#' + Random.hex(true)(engine, 6);
	} else {
		// Make sure hex is capitalized
		scheduleClass.color = scheduleClass.color.toUpperCase();
	}

	// Make sure username is valid first
	const { isUser, userDoc } = await users.get(db, user);

	if (!isUser) throw new Error('Invalid username!');

	// Add teacher to database
	const teacherDoc = await teachers.add(db, scheduleClass.teacher);

	const classdata = db.collection('classes');

	let classes;
	try {
		// Check for duplicate classes first
		classes = await classdata.find({ user: userDoc['_id'] }).toArray();
	} catch (e) {
		throw new Error('There was a problem querying the database!');
	}

	// Lets see if any of the classes are the one we are supposed to edit
	let validEditId = false;
	if (scheduleClass._id !== '') {
		for (const theClass of classes) {
			const classId = theClass['_id'];
			if (scheduleClass._id === classId.toHexString()) {
				validEditId = classId;
				break;
			}
		}
	}

	// Now lets see if any of these classes are duplicate
	const dupClassIds = [];
	for (const classDoc of classes) {
		// If duplicate class, push id to array
		if (scheduleClass.name  === classDoc.name
			&& teacherDoc['_id'].toHexString() === classDoc['teacher'].toHexString()
			&& scheduleClass.block === classDoc.block
			&& scheduleClass.color === classDoc.color
			&& scheduleClass.type  === classDoc.type) {

			dupClassIds.push(classDoc['_id'].toHexString());
		}
	}

	// If any of the classes are duplicate, just give up.
	if (dupClassIds.length > 0) {
		// If the edit id matches one of the dup classes, maybe the student accidentally pressed 'save'.
		// Since nothing changed in that case, just return no error
		if (validEditId) {
			return scheduleClass;
		}

		throw new Error('Tried to insert a duplicate class!');
	}

	let id;
	// Generate an Object ID, or use the id that we are editting
	if (validEditId) {
		id = validEditId;
	} else {
		id = new ObjectID();
	}

	const insertClass = {
		_id: id,
		user: userDoc['_id'],
		name: scheduleClass.name,
		teacher: teacherDoc['_id'],
		type: scheduleClass.type,
		block: scheduleClass.block,
		color: scheduleClass.color,
	};

	try {
		// Finally, if class isn't a duplicate and everything's valid, let's insert it into the database
		await classdata.updateOne({ _id: id }, insertClass, { upsert: true });
	} catch (e) {
		throw new Error('There was a problem upserting the class into the database!');
	}

	await teachers.deleteClasslessTeachers(db);

	return insertClass;
}

/**
 * Gets an array of all the classes under a certain user
 * @function getClasses
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username to get classes under
 * @param {getClassesCallback} callback - Callback
 */

/**
 * Callback after all classes have been retrieved
 * @callback getClassesCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Object} classes - Array of class documents with teacher documents injected in. Null if error.
 */

async function getClasses(db, user) {
	// I'll validate _your_ input baby ;)
	if (typeof db !== 'object') throw new Error('Invalid database connection!');
	if (typeof user !== 'string') throw new Error('Invalid username!');

	// Make sure valid user and get user id
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) throw new Error('User doesn\'t exist!');

	const classdata = db.collection('classes');

	let classes;
	try {
		// Get all classes under the specified user id
		classes = await classdata.find({ user: userDoc['_id'] }).toArray();
	} catch (e) {
		throw new Error('There was a problem querying the database!');
	}

	// Add 'textDark' to all of the classes based on color
	for (const theClass of classes) {
		theClass.textDark = prisma.shouldTextBeDark(theClass.color);
	}

	// Go through all events and set user to actual username, and teacher to actual teacher
	// Save teachers in object so we don't have to query database more than we need to
	const teachersList = {};

	for (const theClass of classes) {
		theClass.user = userDoc.user;

		const teacherId = theClass.teacher;

		if (typeof teachersList[teacherId] === 'undefined') {
			const { teacherDoc } = await teachers.get(db, teacherId);
			teachersList[teacherId] = teacherDoc;
		}

		theClass.teacher = teachersList[teacherId];
	}

	return classes;
}

/**
 * Deletes a class, and teacher if nobody else has the same teacher
 * @function deleteClass
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username. Input user so we make sure nobody is deleting each other's classes!
 * @param {string} classId - Class id
 * @param {deleteClassCallback} callback - Callback
 */

/**
 * Callback after deletes class
 * @callback deleteClassCallback
 *
 * @param {Object} err - Null if success, error object if failure
 */

async function deleteClass(db, user, classId) {
	// Validate inputs
	if (typeof db !== 'object') throw new Error('Invalid database connection!');
	if (typeof user !== 'string') throw new Error('Invalid username!');

	// Try to create object id
	let id;
	try {
		id = new ObjectID(classId);
	} catch (e) {
		throw new Error('Invalid event id!');
	}

	// Make sure valid user
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) throw new Error('User doesn\'t exist!');

	const classdata = db.collection('classes');

	try {
		await classdata.deleteOne({ _id: id, user: userDoc['_id'] });
	} catch (e) {
		throw new Error('There was a problem deleting the class from the database!');
	}

	// @TODO: Error handling if these fail
	await teachers.deleteClasslessTeachers(db);
	await aliases.deleteClasslessAliases(db);
}

module.exports.upsert = upsertClass;
module.exports.get    = getClasses;
module.exports.delete = deleteClass;
