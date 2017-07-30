/**
 * @file Manages sports API endpoints
 */
const sports = require(__dirname + '/../libs/sports.js');

module.exports = app => {

	app.post('/sports/scores', (req, res) => {
		sports.scores((err, scores) => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error, scores });
		});
	});

};
