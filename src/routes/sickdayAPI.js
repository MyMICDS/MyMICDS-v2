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

	app.post('/sickday/get-request', (req, res) => {
		sickday.getRequest(db, 'azhao', (err, requests) => {
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
