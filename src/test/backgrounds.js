'use strict';

var backgrounds = require(__dirname + '/../libs/backgrounds.js');

backgrounds.get('bhollander-bodie', function(err, variants, hasDefault) {
	console.log(err, variants, hasDefault);
});
