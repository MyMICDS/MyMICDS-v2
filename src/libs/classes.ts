import { Block, ClassType } from '@mymicds/sdk';
import { Db, ObjectID } from 'mongodb';
import { InputError, InternalError } from './errors';
import { Omit } from './utils';
import { Teacher } from '@mymicds/sdk/dist/libs/teachers';
import * as aliases from './aliases';
import * as prisma from '@rapid7/prisma';
import * as Random from 'random-js';
import * as teachers from './teachers';
import * as users from './users';

const engine = Random.engines.mt19937().autoSeed();

// RegEx to test if string is a valid hex color ('#XXX' or '#XXXXXX')
const validColor = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i;

/**
 * Inserts/updates a class in the database.
 * @param db Database connection.
 * @param user Username.
 * @param scheduleClass Class object.
 */
async function upsertClass(
	db: Db,
	user: string,
	scheduleClass: {
		_id?: string;
		name: string;
		color?: string;
		block?: Block;
		type?: ClassType;
		teacher: Teacher;
	}
) {
	// Set default
	if (typeof scheduleClass._id !== 'string') {
		scheduleClass._id = '';
	}

	// If no block or type, default to 'other'
	if (!scheduleClass.block) {
		scheduleClass.block = Block.OTHER;
	}
	if (!scheduleClass.type) {
		scheduleClass.type = ClassType.OTHER;
	}

	// If not valid color, generate random
	if (!(scheduleClass.color && validColor.test(scheduleClass.color))) {
		// You think we're playing around here? No. This is MyMICDS.
		// We are going to cryptographically generate a color as random as human intelligence can get us.
		scheduleClass.color = '#' + Random.hex(true)(engine, 6);
	} else {
		// Make sure hex is capitalized
		scheduleClass.color = scheduleClass.color.toUpperCase();
	}

	// Make sure username is valid first
	const { isUser, userDoc } = await users.get(db, user);

	if (!isUser) {
		throw new InputError('Invalid username!');
	}

	// Add teacher to database
	const teacherDoc = await teachers.add(db, scheduleClass.teacher);

	const classdata = db.collection<MyMICDSClassWithIDs>('classes');

	let classes: MyMICDSClassWithIDs[];
	try {
		// Check for duplicate classes first
		classes = await classdata.find({ user: userDoc!._id }).toArray();
	} catch (e) {
		throw new InternalError('There was a problem querying the database!', e);
	}

	// Lets see if any of the classes are the one we are supposed to edit
	let validEditId: ObjectID | null = null;
	if (scheduleClass._id !== '') {
		for (const theClass of classes) {
			const classId = theClass._id;
			if (scheduleClass._id === classId.toHexString()) {
				validEditId = classId;
				break;
			}
		}
	}

	// Now lets see if any of these classes are duplicate
	const dupClassIds: string[] = [];
	for (const classDoc of classes) {
		// If duplicate class, push id to array
		if (
			scheduleClass.name === classDoc.name &&
			teacherDoc._id.toHexString() === classDoc.teacher.toHexString() &&
			scheduleClass.block === classDoc.block &&
			scheduleClass.color === classDoc.color &&
			scheduleClass.type === classDoc.type
		) {
			dupClassIds.push(classDoc._id.toHexString());
		}
	}

	// If any of the classes are duplicate, just give up.
	if (dupClassIds.length > 0) {
		// If the edit id matches one of the dup classes, maybe the student accidentally pressed 'save'.
		// Since nothing changed in that case, just return no error
		if (validEditId) {
			return scheduleClass;
		}

		throw new InputError('Tried to insert a duplicate class!');
	}

	let id;
	// Generate an Object ID, or use the id that we are editting
	if (validEditId) {
		id = validEditId;
	} else {
		id = new ObjectID();
	}

	const insertClass: Omit<MyMICDSClassWithIDs, 'textDark'> = {
		_id: id,
		user: userDoc!._id,
		name: scheduleClass.name,
		teacher: teacherDoc._id,
		type: scheduleClass.type,
		block: scheduleClass.block,
		color: scheduleClass.color
	};

	try {
		// Finally, if class isn't a duplicate and everything's valid, let's insert it into the database
		await classdata.updateOne({ _id: id }, { $set: insertClass }, { upsert: true });
	} catch (e) {
		throw new InternalError('There was a problem upserting the class into the database!', e);
	}

	await teachers.deleteClasslessTeachers(db);

	return insertClass;
}

/**
 * Gets all of a user's classes.
 * @param db Database connection.
 * @param user Username.
 * @returns A list of all class documents.
 */
async function getClasses(db: Db, user: string) {
	// Make sure valid user and get user id
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) {
		throw new InputError("User doesn't exist!");
	}

	const classdata = db.collection<MyMICDSClassWithIDs>('classes');

	let classes: MyMICDSClassWithIDs[];
	try {
		classes = await classdata
			.aggregate([
				// Stage 1
				// Get all classes under the specified user id
				{
					$match: {
						user: userDoc!._id
					}
				},
				// Stage 2
				// Replace teacher id with array of teacher object
				{
					$lookup: {
						from: 'teachers',
						localField: 'teacher',
						foreignField: '_id',
						as: 'teacher'
					}
				},
				// Stage 3
				// Flatten the teacher object array
				{
					$unwind: {
						path: '$teacher'
					}
				},
				// Stage 4
				// Replace user ObjectID with actual username
				{
					$addFields: { user }
				}
			])
			.toArray();
	} catch (e) {
		throw new InternalError('There was a problem querying the database!', e);
	}

	// Add 'textDark' to all of the classes based on color
	for (const theClass of classes) {
		theClass.textDark = prisma.shouldTextBeDark(theClass.color);
	}

	return classes;
}

/**
 * Deletes a class. If nobody else has the same teacher as the class, delete the teacher as well.
 * @param db Database connection.
 * @param user Username.
 * @param classId Class ID to delete.
 */
async function deleteClass(db: Db, user: string, classId: string) {
	// Try to create object id
	let id;
	try {
		id = new ObjectID(classId);
	} catch (e) {
		throw new InputError('Invalid event id!');
	}

	// Make sure valid user
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) {
		throw new InputError("User doesn't exist!");
	}

	const classdata = db.collection('classes');

	try {
		await classdata.deleteOne({ _id: id, user: userDoc!._id });
	} catch (e) {
		throw new InternalError('There was a problem deleting the class from the database!', e);
	}

	// @TODO: Error handling if these fail
	await teachers.deleteClasslessTeachers(db);
	await aliases.deleteClasslessAliases(db);
}

export interface MyMICDSClassWithIDs {
	_id: ObjectID;
	user: ObjectID;
	name: string;
	teacher: ObjectID;
	type: ClassType;
	block: Block;
	color: string;
	textDark?: boolean;
}

export { upsertClass as upsert, getClasses as get, deleteClass as delete };
