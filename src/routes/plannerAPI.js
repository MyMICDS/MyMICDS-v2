/**
 * @file Manages planner API endpoints
 */

var config = require(__dirname + '/../libs/config.js');

var MongoClient = require('mongodb').MongoClient;
var planner     = require(__dirname + '/../libs/planner.js');

module.exports = function(app) {

    app.post('/planner/get-events', function(req, res) {
        var date = {
            year : req.body.year,
            month: req.body.month
        };

        MongoClient.connect(config.mongodbURI, function(err) {
            if(err) {
                db.close();
                res.json({
                    error : 'There was a problem connecting to the database!',
                    events: null
                });
                return;
            }

            planner.getMonthEvents(db, req.session.user, date, function(err, events) {
                db.close();
                if(err) {
                    var errorMessage = err.message;
                } else {
                    var errorMessage = null;
                }
                res.json({
                    error : errorMessage,
                    events: events
                });
            });
        });
    });

}
