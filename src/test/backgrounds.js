'use strict';

const backgrounds = require(__dirname + '/../libs/backgrounds.js');

backgrounds.get('bhollander-bodie', (err, variants, hasDefault) => {
	console.log(err, variants, hasDefault); // eslint-disable-line
});
