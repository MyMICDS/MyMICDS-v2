module.exports = function(app) {
	app.post('/login', function(req, res) {
		
		// Connect to database, validate credentials
		console.log(req.body);
		res.json({
			"Success": true,
			"Response Message": null,
		});
		
	});
}