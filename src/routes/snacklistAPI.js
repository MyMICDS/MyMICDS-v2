const snacklist = require(__dirname + '/../libs/snacklist.js');

module.exports = (app, db) => {
	app.post('/snacklist/update-advisor', (req, res) => {
		snacklist.updateAdvisor(db, req.user.user, req.body.advisor, (err) => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error });
		});
	});

	app.post('/snacklist/get-advisory', (req, res) => {
		snacklist.getAdvisory(db, req.user.user, (err, advisory) => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error, advisory });
		});
	});
};
