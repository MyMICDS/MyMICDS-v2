'use strict';

const portal = require(__dirname + '/portal');
const users   = require(__dirname + '/users.js');
const ObjectID = require('mongodb').ObjectID;
const async = require('async');

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
						request: request,
						responses: []
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

// options object: {
// 	from: string,
// 	to: string
// }

function getRequest(db, options, callback) {
	if (typeof callback !== 'function') return;

	if (typeof db !== 'object') {
		callback(new Error('Invalid databse connection!'), null);
		return;
	}
	if (typeof options !== 'object' || (typeof options.from !== 'string' && typeof options.to !== 'string')) {
		callback(new Error('Invalid user options!'), null);
		return;
	}

	async.parallel({
		from: (err, userCB) => {
			if (options.from) {
				users.get(db, options.from, (err, isUser, userDoc) => {
					if(err) {
						userCB(err, null);
						return;
					}
					if(!isUser) {
						userCB(new Error('User doesn\'t exist!'), null);
						return;
					}

					userCB(null, userDoc);
				});
			}
			userCB(null, null);
		},
		to: (err, userCB) => {
			if (options.to) {
				users.get(db, options.to, (err, isUser, userDoc) => {
					if(err) {
						userCB(err, null);
						return;
					}
					if(!isUser) {
						userCB(new Error('User doesn\'t exist!'), null);
						return;
					}

					userCB(null, userDoc);
				});
			}
			userCB(null, null);
		}
	}, (err, results) => {
		if (err) {
			callback(err, null);
			return;
		}
		const sickdayReq = db.collection('sickdayRequests');

		sickdayReq.aggregate([
			{ $match: {
				to: results.to ? results.to._id : null,
				from: results.from ? results.from._id : null
			} },
			{ $lookup: { from: 'users', localField: 'from', foreignField: '_id', as: 'from' } },
			{ $unwind: '$from' }
		]).toArray((err, requests) => {
			callback(null, requests);
		});
	});
}

function cancelRequest(db, user, classStr, callback) {
	if (typeof callback !== 'function') return;

	if (typeof db !== 'object') {
		callback(new Error('Invalid databse connection!'), false);
		return;
	}
	if (typeof user !== 'string') {
		callback(new Error('Invalid username!'), false);
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

		sickdayReq.deleteMany({ from: userDoc._id, classStr }, (err) => {
			if (err) {
				callback(new Error(err), false);
			}
			callback(null, true);
		});
	});
}

function postResponse(db, user, reqId, response, callback) {
	if (typeof callback !== 'function') return;

	if (typeof db !== 'object') {
		callback(new Error('Invalid databse connection!'), false);
		return;
	}
	if (typeof user !== 'string') {
		callback(new Error('Invalid username!'), false);
		return;
	}
	let requestId;
	try {
		requestId = new ObjectID(reqId);
	} catch (err) {
		callback(new Error('Invalid request ID!'), false);
		return;
	}
	if (typeof reponse !== 'string') {
		callback(new Error('Invalid response string!'), false);
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

		sickdayReq.update({ _id: requestId }, { $push: { responses: { from: userDoc, response } } }, (err) => {
			if (err) {
				callback(new Error(err), false);
			}
			callback(null, true);
		});
	});
}

module.exports.postRequest   = postRequest;
module.exports.postResponse  = postResponse;
module.exports.getRequest    = getRequest;
module.exports.cancelRequest = cancelRequest;
