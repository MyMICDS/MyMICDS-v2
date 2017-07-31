'use strict';

const portal = require(__dirname + '/portal');
const users   = require(__dirname + '/users.js');

function postRequest(db, user, classStr, request, callback) {
	if (typeof callback !== 'function') return;

	if (typeof db !== 'object') {
		callback(new Error('Invalid databse connection!'), false);
		return;
	}
	if (typeof user !== 'string') {
		callback(new Error('Invalid username!'), false);
		return;
	}
	if (typeof request !== 'string') {
		callback(new Error('Invalid request string!'), false);
		return;
	}

	// Make sure valid user
	users.get(db, user, (err, isUser, userDoc) => {
		if(err) {
			callback(err, false);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'), false);
			return;
		}

		const sickdayReq = db.collection('sickdayRequests');

		sickdayReq.deleteMany({ from: userDoc._id }, (err) => {
			if (err) {
				callback(new Error('Error in deleting past requests: ' + err), false);
				return;
			}
			portal.getClassmates(db, classStr, (err, classmates) => {
				if (err) {
					callback(new Error('Error getting classmates: ' + err), false);
					return;
				}
				sickdayReq.insertMany(classmates.map(classmate => {
					return {
						from: userDoc._id,
						to: classmate.userId,
						class: classStr,
						request: request
					};
				}), (err) => {
					if (err) {
						callback(new Error('Error in inserting new requests: ' + err), false);
						return;
					}
					callback(null, true);
				});
			});
		});
	});
}

function getRequest(db, user, callback) {
	if (typeof callback !== 'function') return;

	if (typeof db !== 'object') {
		callback(new Error('Invalid databse connection!'), null);
		return;
	}
	if (typeof user !== 'string') {
		callback(new Error('Invalid username!'), null);
		return;
	}

	users.get(db, user, (err, isUser, userDoc) => {
		if(err) {
			callback(err, null);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'), null);
			return;
		}

		const sickdayReq = db.collection('sickdayRequests');

		sickdayReq.aggregate([
			{ $match: { to: userDoc._id } },
			{ $lookup: { from: 'users', localField: 'to', foreignField: '_id', as: 'to' } },
			{ $unwind: '$to' }
		]).toArray((err, requests) => {
			callback(null, requests);
		});
	});
}

function cancelRequest(db, user, classStr, callback) {
	// if (typeof callback !== 'function') return;

	// if (typeof db !== 'object') {
	// 	callback(new Error('Invalid databse connection!'), false);
	// 	return;
	// }
	// if (typeof user !== 'string') {
	// 	callback(new Error('Invalid username!'), false);
	// 	return;
	// }

	// // Make sure valid user
	// users.get(db, user, (err, isUser, userDoc) => {
	// 	if(err) {
	// 		callback(err, false);
	// 		return;
	// 	}
	// 	if(!isUser) {
	// 		callback(new Error('User doesn\'t exist!'), false);
	// 		return;
	// 	}

	// 	const sickdayReq = db.collection('sickdayRequests');

	// 	sickdayReq()
	// });
}

module.exports.postRequest   = postRequest;
module.exports.getRequest    = getRequest;
module.exports.cancelRequest = cancelRequest;
