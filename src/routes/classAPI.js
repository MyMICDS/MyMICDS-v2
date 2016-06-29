/**
 * @file Manages class API endpoints
 */

var classes = require(__dirname + '/../libs/classes.js');

module.exports = function(app) {

	app.post('/classes/list', function(req, res) {
		classes.getClasses(req.session.user, function(err, classes) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({
				error: errorMessage,
				classes: classes
			})
		});
	});

    app.post('/classes/add', function(req, res) {
        var user = req.session.user;
        var scheduleClass = {
			id  : req.body.id,
            name: req.body.name,
            color: req.body.color,
            block: req.body.block,
            type : req.body.type,
			teacher: {
				prefix: req.body.teacherPrefix,
            	firstName: req.body.teacherFirstName,
				lastName : req.body.teacherLastName
			}
        };
        classes.upsertClass(user, scheduleClass, function(err, id) {
            if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({
				error: errorMessage,
				id: id
			});
        });
    });

    app.post('/classes/delete', function(req, res) {
		console.log('Deleting class ' + req.body.id + '???!');
		classes.deleteClass(req.session.user, req.body.id, function(success, response) {
			res.json({success: success, message: response});
		});
    });

};
