'use strict';

/**
 * @file Manages alias API endpoints
 */

var alias = require(__dirname + "/../libs/alias.js");

module.exports = function(app, db) {

	app.post('/alias/create', function(req, res) {
		if(req.body.type === "portal") {
			alias.createPortal(db, req.body.classNative, req.body.classRemote, function(err) {
				if(err) {
					var errMessage = err.message;
				} else {
					var errMessage = null;
				}
				res.json({error: errMessage});
			});
		} else if(req.body.type === "canvas") {
			alias.createCanvas(db, req.body.classNative, req.body.classRemote, function(err) {
				if(err) {
					var errMessage = err.message;
				} else {
					var errMessage = null;
				}
				res.json({error: errMessage});
			});
		} else {
			res.json({error: "Invalid alias type!"});
		}
	});

	app.post('/alias/get', function(req, res) {
		if(req.body.type === "portal") {
			alias.getPortal(db, req.body.classInput, function(err, classOutput) {
				if(err) {
					var errMessage = err.message;
				} else {
					var errMessage = null;
				}
				res.json({
					error: errMessage,
					output: classOutput
				});
			});
		} else if(req.body.type === "canvas") {
			alias.getCanvas(db, req.body.classInput, function(err, classOutput) {
				if(err) {
					var errMessage = err.message;
				} else {
					var errMessage = null;
				}
				res.json({
					error: errMessage,
					output: classOutput
				});
			});
		} else {
			res.json({error: "Invalid alias type!"});
		}
	});

}