import { Db, ObjectID } from 'mongodb';
import * as users from './users';

async function getNotes(db: Db, user: string, moduleId: string) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }
	if (typeof moduleId !== 'string') { throw new Error('Invalid moduleId!'); }

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('Invalid username!'); }

	const stickynotes = db.collection<StickyNoteDoc>('stickynotes');

	const notes = await stickynotes.find({ user: userDoc!._id, moduleId }).toArray();

	// Create a new stickynote if nothing exits under the module Id
	if (notes.length === 0) {
		return '';
	}

	return notes[0];
}

async function postNote(db: Db, user: string, moduleId: string, text: string) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }
	if (typeof moduleId !== 'string') { throw new Error('Invalid moduleId!'); }
	if (typeof text !== 'string') { throw new Error('Invalid note text!'); }

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('Invalid username!'); }

	const stickynotes = db.collection('stickynotes');

	return stickynotes.updateOne(
		{ user: userDoc!._id, moduleId },
		{ $set: { user: userDoc!._id, text } },
		{ upsert: true }
	);
}

export interface StickyNoteDoc {
	_id: ObjectID;
	moduleId: string;
	user: ObjectID;
	text: string;
}

export {
	getNotes as get,
	postNote as post
};
