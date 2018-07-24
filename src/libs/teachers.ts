import { Teacher } from '@mymicds/sdk';
import { Db, ObjectID } from 'mongodb';
import { Omit } from './utils';

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

async function addTeacher(db: Db, teacher: Omit<Teacher, '_id'>) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }
	if (typeof teacher !== 'object') { throw new Error('Invalid teacher object!'); }
	if (!validTeacherPrefixes.includes(teacher.prefix)) { throw new Error('Invalid teacher prefix!'); }
	if (typeof teacher.firstName !== 'string') { throw new Error('Invalid teacher first name!'); }
	if (typeof teacher.lastName !== 'string') { throw new Error('Invalid teacher last name!'); }

	const teacherdata = db.collection<TeacherWithID>('teachers');

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

async function getTeacher(db: Db, teacherId: ObjectID) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }
	if (typeof teacherId !== 'object') { throw new Error('Invalid teacher id object!'); }

	const teacherdata = db.collection<Teacher>('teachers');

	try {
		// Query database to find possible teacher
		const docs = await teacherdata.find({ _id: teacherId }).toArray();

		let isTeacher = false;
		let teacher: Teacher | null = null;

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

async function listTeachers(db: Db) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }

	const teacherdata = db.collection<Teacher>('teachers');

	try {
		return await teacherdata.find({}).toArray();
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

export async function deleteClasslessTeachers(db: Db) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }

	const teacherdata = db.collection<Teacher>('teachers');

	let docs: Teacher[];

	try {
		// Find all teachers with 0 classes
		docs = await teacherdata.aggregate([
			// Stage 1
			{
				$lookup: {
					from: 'classes',
					localField: '_id',
					foreignField: 'teacher',
					as: 'classes'
				}
			},
			// Stage 2
			{
				$match: {
					classes: {
						$size: 0
					}
				}
			}
		]).toArray();
	} catch (e) {
		throw new Error('There was a problem querying the database!');
	}

	try {
		await Promise.all(docs.map(t => teacherdata.deleteOne({ _id: t._id })));
	} catch (e) {
		throw new Error('There was a problem deleting classless teachers!');
	}
}

export {
	addTeacher as add,
	getTeacher as get,
	listTeachers as list
};

export interface TeacherWithID {
	_id: ObjectID;
	prefix: string;
	firstName: string;
	lastName: string;
}
