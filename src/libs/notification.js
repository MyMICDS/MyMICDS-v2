"use strict";

var planner = require(__dirname + '/planner.js');
var announcements = require(__dirname + '/announcements.js')

function getNotifications(db, user, includeCanvas, callback) {
     var notifications = [];
     planner.getWithinWeek(db, user, includeCanvas, function(err, events) {
         if (err) {
             callback(err);
             return;
         }
         notifications.concat(events);
     });
     callback(null, {notifications, announcements})
}

module.exports.getNotifications = getNotifications