/**
 * @file Class manipulation endpoints
 */

var classes = require(__dirname + '/../libs/classes.js');

module.exports = function(app) {

	app.post('/get-classes', function(req, res) {
		var user = req.session.user;
		classes.getClasses(user, function(success, classes) {
			res.json(success ? classes : false);
		});
	});

    app.post('/add-class', function(req, res) {
        var user = req.session.user;
        var scheduleClass =
        {
			id  : req.body.id,
            name: req.body.name,
			teacherPrefix: req.body.teacherPrefix,
            teacherFirstName: req.body.teacherFirstName,
			teacherLastName : req.body.teacherLastName,
            block: req.body.block,
            color: req.body.color,
            type : req.body.type,
            displayPlanner: req.body.displayPlanner ? true : false,
        };
        classes.addClass(user, scheduleClass, function(success, id) {
            if(success) {
                res.json({success: true, classId: id, message: 'Success!'});
            } else {
                res.json({success: false, classId: null, message: id})
            }
        }, req.body.id);
    });

    app.post('/delete-class', function(req, res) {
		console.log('Deleting class ' + req.body.id + '???!');
		classes.deleteClass(req.session.user, req.body.id, function(success, response) {
			res.json({success: success, message: response});
		});
    });

    app.post('/configure-schedule', function(req, res) {

    });

    app.post('/delete-schedule', function(req, res) {

    });
};
