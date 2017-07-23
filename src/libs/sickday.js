'use strict';

var classes = require('./classes');

function postRequest(db, user, request, callback) {
    if (typeof callback !== 'function') return;

    if (typeof db !== 'object') {
        callback(new Error('Invalid databse connection!'), null, null);
        return;
    }
    if (typeof user !== 'string') {
        callback(new Error('Invalid username!'), null, null);
        return;
    }
    if (typeof request !== 'string') {
        callback(new Error('Invalid username!'), null, null);
        return;
    }

    var sickdayReq = db.collection('sickday-requests');

    classes.get(db, user, function(err, classes) {
        console.log(classes);
    })

    // sickdayReq.update({ from: user }, {
    // 	$set: {
    // 		from: user,
    // 		request: request,
    // 		to: []
    // 	},
    //     $currentDate: {}
    // }, { upsert: true })
}