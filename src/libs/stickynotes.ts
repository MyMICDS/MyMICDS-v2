const users = require('./users');

async function getNotes(db, user, moduleId) {
	if (typeof db !== 'object') throw new Error('Invalid database connection!');
	if (typeof moduleId !== 'string') throw new Error('Invalid moduleId!');

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) throw new Error('Invalid username!');

	const stickynotes = db.collection('stickynotes');

	const notes = await stickynotes.find({ user: userDoc._id, moduleId }).toArray();

	// Create a new stickynote if nothing exits under the module Id
	if (notes.length === 0) {
		return '';
	}

	return notes[0];
}

async function postNote(db, user, moduleId, text) {
	if (typeof db !== 'object') throw new Error('Invalid database connection!');
	if (typeof moduleId !== 'string') throw new Error('Invalid moduleId!');
	if (typeof text !== 'string') throw new Error('Invalid note text!');

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) throw new Error('Invalid username!');

	const stickynotes = db.collection('stickynotes');

	return stickynotes.updateOne({ user: userDoc._id, moduleId }, { $set: { user: userDoc._id, text } }, { upsert: true });
}

module.exports.get = getNotes;
module.exports.post = postNote;
