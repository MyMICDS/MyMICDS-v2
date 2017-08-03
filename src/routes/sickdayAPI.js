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

	app.post('/sickday/get/incoming', (req, res) => {
		sickday.getRequest(db, { from: null, to: req.user.user }, (err, requests) => {
			if (err) {
				res.json({
					error: err.message,
					requests
				});
			}
			res.json({
				error: null,
				requests
			});
		});
	});

	app.post('/sickday/get/outgoing', (req, res) => {
		sickday.getRequest(db, { from: req.user.user, to: null }, (err, requests) => {
			if (err) {
				res.json({
					error: err.message,
					requests
				});
			}
			res.json({
				error: null,
				requests
			});
		});
	});

	app.post('/sickday/cancel-request', (req, res) => {
		sickday.cancelRequest(db, req.user.user, req.body.classStr, (err, success) => {
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

	app.post('/sickday/post-response', (req, res) => {
		sickday.postResponse(db, req.user.user, req.body.reqId, req.body.response, (err, success) => {
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

};
