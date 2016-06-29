/**
 * @file Manages planner API endpoints
 */

var planner = require(__dirname + '/../libs/planner.js');

module.exports = function(app, db) {

    app.post('/planner/get-events', function(req, res) {
        var date = {
            year : req.body.year,
            month: req.body.month
        };

        planner.getMonthEvents(db, req.session.user, date, function(err, events) {
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

}
