const sickday = require('../libs/sickday');

module.exports = function(app, db) {

	app.post('/sickday/post-request', (req, res) => {
		sickday.postRequest(db, req.user.user, req.body.classStr, req.body.request, (err, success) => {
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

	// app.post('/sickday/get-request', (req, res) => {});

	// app.post('/sickday/post-response', (req, res) => {});

};