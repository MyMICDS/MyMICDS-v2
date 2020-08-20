import { Db, ObjectID } from 'mongodb';
import { InputError } from './errors';
import { Omit } from './utils';
import { Teacher } from '@mymicds/sdk';

const validTeacherPrefixes = ['Mr.', 'Ms.'];

/**
 * Inserts a new (unique) teacher into the database.
 * @param db Database connection.
 * @param teacher Teacher object to insert.
 */
async function addTeacher(db: Db, teacher: Omit<Teacher, '_id'>) {
	if (!validTeacherPrefixes.includes(teacher.prefix)) {
		throw new InputError('Invalid teacher prefix!');
	}

	const teacherdata = db.collection<TeacherWithIDOptional>('teachers');

	try {
		// Upsert teacher into collection
		await teacherdata.updateOne(teacher, { $set: teacher }, { upsert: true });
	} catch (e) {
		throw new Error('There was a problem inserting the teacher into the database!');
	}

	try {
		const docs = await teacherdata.find<TeacherWithID>(teacher).toArray();
		return docs[0];
	} catch (e) {
		throw new Error('There was a problem querying the database!');
	}
}

/**
 * Retrieves the teacher with the given ID.
 * @param db Database connection.
 * @param teacherId Teacher ID to find.
 * @returns Whether the object ID points to a valid teacher and the corresponding teacher document.
 */
async function getTeacher(db: Db, teacherId: ObjectID) {
	const teacherdata = db.collection<Teacher>('teachers');

	try {
		// Query database to find possible teacher
		const docs = await teacherdata.find({ _id: teacherId.toHexString() }).toArray();

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
 * Enumerates all teachers in database. Used for typeahead on the frontend.
 * @param db Database connection.
 * @returns A list of all the teacher objects in the database.
 */
async function listTeachers(db: Db) {
	const teacherdata = db.collection<Teacher>('teachers');

	try {
		return await teacherdata.find({}).toArray();
	} catch (e) {
		throw new Error('There was a problem querying the database!');
	}
}

/**
 * Deletes all teachers that are not linked to any class.
 * @param db Database connection.
 */
export async function deleteClasslessTeachers(db: Db) {
	const teacherdata = db.collection<Teacher>('teachers');

	let docs: Teacher[];

	try {
		// Find all teachers with 0 classes
		docs = await teacherdata
			.aggregate([
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
			])
			.toArray();
	} catch (e) {
		throw new Error('There was a problem querying the database!');
	}

	try {
		await Promise.all(docs.map(t => teacherdata.deleteOne({ _id: t._id })));
	} catch (e) {
		throw new Error('There was a problem deleting classless teachers!');
	}
}

export { addTeacher as add, getTeacher as get, listTeachers as list };

export interface TeacherWithIDOptional {
	_id?: ObjectID;
	prefix: string;
	firstName: string;
	lastName: string;
}

export interface TeacherWithID extends TeacherWithIDOptional {
	_id: ObjectID;
}
