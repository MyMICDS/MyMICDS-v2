function updateAdvisor(db, user, advisor, callback) {
	if(typeof callback !== 'function') {
		callback = () => {};
	}

	if (typeof advisor !== 'string') {
		callback(new Error('Invalid advisor!'));
		return;
	}

	const studentAdvisor = db.collection('studentAdvisor');

	studentAdvisor.update({ user }, { user, advisor }, { upsert: true }, (err) => {
		if (err) {
			callback(new Error(err));
			return;
		}
		callback(null);
	});
}

function getAdvisory(db, user, callback) {
	if(typeof callback !== 'function') {
		callback = () => {};
	}

	const studentAdvisor = db.collection('studentAdvisor');

	studentAdvisor.findOne({ user }, (err, doc) => {
		if (err) {
			callback(new Error(err), null);
			return;
		}
		studentAdvisor.aggregate([
			{ $match: { advisor: doc.advisor } },
			{ $lookup: { from: 'users', localField: 'user', foreignField: 'user', as: 'user' } },
			{ $replaceRoot: { newRoot: { $arrayElemAt: [ '$user', 0 ] } } },
			{ $project: { _id: 0, user: 1, firstName: 1, lastName: 1 } }
		]).toArray((err, docs) => {
			if (err) {
				callback(new Error(err), null);
				return;
			}
			callback(null, {
				advisor: doc.advisor,
				students: docs
			});
		});
	});
}

// function getAdvisoryDays() {

// }

// function getSnackDuty() {

// }

module.exports.updateAdvisor = updateAdvisor;
module.exports.getAdvisory   = getAdvisory;

// remember to put an index for each user of the list 
