function getNotes(db, moduleId, callback) {
	if(typeof callback !== 'function') return;
	
	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}

	if(typeof moduleId !== 'string') {
		callback(new Error('Invalid moduleId!'), null);
		return;
	}

	const stickynotes = db.collection('stickynotes');

	stickynotes.find({ moduleId }).toArray((err, notes) => {
		if (err) {
			callback(new Error(err), null);
			return;
		}

		// create a new stickynote if nothing exits under the module Id
		if (notes.length === 0) {
			let noteDoc = { text: 'New Stickynote', moduleId };
			stickynotes.insertOne(noteDoc, (err, note) => {
				if (err) {
					callback(new Error(err), null);
					return;
				}
				callback(null, noteDoc);
			})
		} else {
			callback(null, notes[0]);
		}
	});
}

function postNote(db, text, moduleId, callback) {
	if(typeof callback !== 'function') return;
	
	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}

	if(typeof text !== 'string') {
		callback(new Error('Invalid note text!'));
		return;
	}

	if(typeof moduleId !== 'string') {
		callback(new Error('Invalid moduleId!'));
		return;
	}

	const stickynotes = db.collection('stickynotes');

	stickynotes.update({ moduleId }, { $set: {text} }, (err) => {
		if (err) {
			callback(new Error(err));
		}
		callback(null);
	});
}

module.exports.get = getNotes;
module.exports.post = postNote;
