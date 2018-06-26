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
			{
				$match: { advisor: doc.advisor }
			},
			{
				$lookup: { from: 'users', localField: 'user', foreignField: 'user', as: 'user' }
			},
			{
				$replaceRoot: { newRoot: { $arrayElemAt: [ '$user', 0 ] } }
			},
			{
				$lookup: { from: 'snackDuty', localField: 'user', foreignField: 'user', as: 'snackDutyTemp' }
			},
			{
				$replaceRoot: { newRoot: { $mergeObjects: [ { $arrayElemAt: [ '$snackDutyTemp', 0 ] }, '$$ROOT' ] } }
			},
			{
				$project: { _id: 0, user: 1, firstName: 1, lastName: 1, snackDuty: 1 }
			}
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
		let numberOfDays = 0;

		const currDate = new Date(2019, 3, 1);
		const secondYear = currDate.getMonth() + 1 < 6;
		const currYear = currDate.getFullYear();
		const startYear = secondYear ? currYear - 1 : currYear;
		const currMonth = currDate.getMonth() + 1;
		// console.log(secondYear, currYear, startYear)
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
			// console.log(startMonth, endMonth)
			for (let month = startMonth; month <= endMonth; month++) {
				let daysKeys = [];
				try {
					daysKeys = Object.keys(days[year][month]);
				} catch (e) {
					callback(new Error('School is not in session.'), null);
					return;
				}
				daysKeys.forEach(day => {
					let date = new Date(year, month - 1, day);
					if (date.valueOf() > currDate.valueOf()) {
						return;
					}

					let dayRotation = days[year][month][day];
					// console.log(year, month, day, dayRotation, !(
					// 	date.getDay() === 3 && // Not Wednesday late starts but...
					// 	(dayRotation !== 1 && dayRotation !== 4) // Day 1 and Day 4 late starts have advisory
					// ))
					if (!(
						date.getDay() === 3 && // Not Wednesday late starts but...
						(dayRotation !== 1 && dayRotation !== 4) // Day 1 and Day 4 late starts have advisory
					)) {
						numberOfDays++;
					}
				});
			}
		}
		callback(err, numberOfDays);
	});
}

function giveSnackDuty(db) {
	const studentAdvisor = db.collection('studentAdvisor');
	const snackDuty = db.collection('snackDuty');

	studentAdvisor.aggregate([
		{ $group: { _id: '$advisor', students: { $push: '$user' } } }
	]).toArray((err, docs) => {
		if (err) {
			console.log(err);
			return;
		}

		getAdvisoryDays((err, numberOfDays) => {
			if (err) {
				console.log(err);
				return;
			}
			console.log(err, docs, numberOfDays);
			docs.forEach((doc) => {
				const nextStudent = doc.students[numberOfDays % doc.students.length];
				console.log({ user: nextStudent });
				snackDuty.update({ advisor: doc._id }, {
					advisor: doc._id,
					user: nextStudent,
					snackDuty: true
				}, { upsert: true }, (err) => {
					if (err) {
						console.log(new Error(err));
						return;
					}
					console.log('Update snack duty success.');
				});
			});
		});
	});
}

module.exports.updateAdvisor = updateAdvisor;
module.exports.getAdvisory   = getAdvisory;
module.exports.giveSnackDuty = giveSnackDuty;

// remember to put an index for each user of the list 
