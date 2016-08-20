'use strict';

var planner = require(__dirname + '/planner.js');
var announcements = require(__dirname + '/announcements.js')

function getNotifications(db, user, includeCanvas, callback) {
    if(typeof callback !=='function') return;

     var notifications = {upcoming: [], ending: []};
     planner.getMonthEvents(db, user, includeCanvas, function(err, events) {
         if (err) {
             callback(err);
             return;
         }
         //reformat the events
         for (var i=0;i<events.upcoming.length;i++) {
             if (events.upcoming[i].class) {
                 notifications.upcoming.push({
                    type: 'Planner',
                    title: events.upcoming[i].title,
                    content: events.upcoming[i].desc,
                    color: events.upcoming[i].class.color,
                    dueDate: new Date(events.upcoming[i].end),
                })
             } else {
                 notifications.upcoming.push({
                    type: 'Planner',
                    title: events.upcoming[i].title,
                    content: events.upcoming[i].desc,
                    dueDate: new Date(events.upcoming[i].end),
                })
             }
         }
         for (var i=0;i<events.ending.length;i++) {
             if (events.ending[i].class) {
                 notifications.ending.push({
                    type: 'Planner',
                    title: events.ending[i].title,
                    content: events.ending[i].desc,
                    color: events.ending[i].class.color,
                    dueDate: new Date(events.ending[i].end),
                })
             } else {
                 notifications.ending.push({
                    type: 'Planner',
                    title: events.ending[i].title,
                    content: events.ending[i].desc,
                    dueDate: new Date(events.ending[i].end),
                })
             }
         }
         callback(null, {notifications, announcements})
     });
}

module.exports.get = getNotifications;
