'use strict';

const portal = require(__dirname + '/portal.js');

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

function getAdvisoryDays(callback) {
	portal.getDayRotations((err, days) => {
		const secondYear = new Date().getMonth < 6;
		const currYear = new Date().getFullYear();
		const startYear = secondYear ? currYear - 1 : currYear;
		const currMonth = new Date().getMonth();
		for (let year = startYear; year <= currYear; year++) {
			let startMonth = 0;
			let endMonth = 0;
			if (secondYear) {
				if (year === startYear) {
					startMonth = 8;
					endMonth = 12;
				} else {
					startMonth = 1;
					endMonth = currMonth;
				}
			} else {
				startMonth = 8;
				endMonth = currMonth;
			}
			for (let month = startMonth; month < endMonth; month++) {
				days[year][month].keys.forEach(day => {
					if (days[year][month][day] === ) {}
				});
			}
		}
		callback(err, days);
	});
}

function giveSnackDuty(db) {
	const studentAdvisor = db.collection('studentAdvisor');

	studentAdvisor.aggregate([
		{ $group: { _id: '$advisor', students: { $push: '$user' } } }
	]).toArray((err, docs) => {
		if (err) {
			console.log(err);
			return;
		}
		getAdvisoryDays((err, days) => {
			if (err) {
				console.log(err);
				return;
			}
			console.log(err, docs);
		});
	});
}

module.exports.updateAdvisor = updateAdvisor;
module.exports.getAdvisory   = getAdvisory;
module.exports.giveSnackDuty = giveSnackDuty;

// remember to put an index for each user of the list 
