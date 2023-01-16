import { Db, ObjectId } from 'mongodb';
import { InputError } from './errors';
import * as users from './users';

/**
 * Retrieves all of a user's sticky notes.
 * @param db Database connection.
 * @param user Username.
 * @param moduleId The module ID associated with the sticky notes.
 * @returns A sticky note object.
 */
async function getNotes(db: Db, user: string, moduleId: string) {
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) {
		throw new InputError('Invalid username!');
	}

	const stickynotes = db.collection<StickyNoteDoc>('stickynotes');

	const notes = await stickynotes.find({ user: userDoc!._id, moduleId }).toArray();

	// Create a new stickynote if nothing exits under the module Id
	if (notes.length === 0) {
		return '';
	}

	return notes[0];
}

/**
 * Posts/edits a new sticky note.
 * @param db Database connection.
 * @param user Username.
 * @param moduleId The module ID associated with the sticky notes.
 * @param text The content of the sticky note.
 */
async function postNote(db: Db, user: string, moduleId: string, text: string) {
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) {
		throw new InputError('Invalid username!');
	}

	const stickynotes = db.collection('stickynotes');

	return stickynotes.updateOne(
		{ user: userDoc!._id, moduleId },
		{ $set: { user: userDoc!._id, text } },
		{ upsert: true }
	);
}

export interface StickyNoteDoc {
	_id: ObjectId;
	moduleId: string;
	user: ObjectId;
	text: string;
}

export { getNotes as get, postNote as post };
