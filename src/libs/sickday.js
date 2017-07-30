'use strict';

var portal = require(__dirname + '/portal');
var users   = require(__dirname + '/users.js');
var async   = require('async');

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
	users.get(db, user, function(err, isUser, userDoc) {
		if(err) {
			callback(err, false);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'), false);
			return;
		}

		var sickdayReq = db.collection('sickdayRequests');
		var portalClasses = db.collection('portalClasses')

		// portal.getClasses(db, user, function(err, hasUrl, classDocs) {
		// 	if (err) {
		// 		callback(new Error('Error in getting classes from protal: ' + err), false);
		// 		return;
		// 	}
		// 	if (!hasUrl) {
		// 		callback(new Error('User does not have a portal URL.'), false);
		// 		return;
		// 	}
		sickdayReq.deleteMany({ from: userDoc._id }, function(err) {
			if (err) {
				callback(new Error('Error in deleting past requests: ' + err), false);
				return;
			}
			portal.getClassmates(db, classStr, function(err, classmates) {
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
					}
				}), function(err) {
					if (err) {
						callback(new Error('Error in inserting new requests: ' + err), false);
						return;
					}
					callback(null, true)
				})
			})
		});
	})
}

function cancelRequest() {
}

module.exports.postRequest   = postRequest;
module.exports.cancelRequest = cancelRequest;