const backgrounds = require(__dirname + '/../libs/backgrounds.js');

backgrounds.get('bhollander-bodie').then(({ variants, hasDefault }) => {
	console.log(variants, hasDefault);
}).catch(err => {
	throw err;
});
