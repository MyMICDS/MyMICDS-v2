const users = require('./users');

function getNotes(db, user, moduleId, callback) {
	if (typeof callback !== 'function') return;

	if (typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}

	if (typeof moduleId !== 'string') {
		callback(new Error('Invalid moduleId!'), null);
		return;
	}

	users.get(db, user, (err, isUser, userDoc) => {
		if (err) {
			callback(err, null);
			return;
		}
		if (!isUser) {
			callback(new Error('Invalid username!'));
			return;
		}

		const stickynotes = db.collection('stickynotes');

		stickynotes.find({ user: userDoc._id, moduleId }).toArray((err, notes) => {
			if (err) {
				callback(new Error(err), null);
				return;
			}

			// Create a new stickynote if nothing exits under the module Id
			if (notes.length === 0) {
				callback(null, '');
			} else {
				callback(null, notes[0]);
			}
		});
	});
}

function postNote(db, user, moduleId, text, callback) {
	if (typeof callback !== 'function') return;

	if (typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}

	if (typeof moduleId !== 'string') {
		callback(new Error('Invalid moduleId!'));
		return;
	}

	if (typeof text !== 'string') {
		callback(new Error('Invalid note text!'));
		return;
	}

	users.get(db, user, (err, isUser, userDoc) => {
		if (err) {
			callback(err, null);
			return;
		}
		if (!isUser) {
			callback(new Error('Invalid username!'));
			return;
		}

		const stickynotes = db.collection('stickynotes');

		stickynotes.update({ user: userDoc._id, moduleId }, { $set: { user: userDoc._id, text }}, { upsert: true }, (err) => {
			if (err) {
				callback(new Error(err));
			}
			callback(null);
		});
	});
}

module.exports.get = getNotes;
module.exports.post = postNote;
