var sickday = require('../libs/sickday');

module.exports = function(app, db, socketIO) {

    app.post('/sickday/post-request', function(req, res) {
        sickday.postRequest(db, req.user.user, req.body.classStr, req.body.request, function(err, success) {
            if (err) {
                res.json({
                    error: err.message,
                    success: success
                });
			} else {
				res.json({
					error: null,
					success: success
				});
			}
        });
    });

    app.post('/sickday/get-request', function(req, res) {});

    app.post('/sickday/post-response', function(req, res) {});

}