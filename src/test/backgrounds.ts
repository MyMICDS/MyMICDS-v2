import * as backgrounds from '../libs/backgrounds';

backgrounds
	.get('bhollander-bodie')
	.then(({ variants, hasDefault }) => {
		console.log(variants, hasDefault);
	})
	.catch(err => {
		throw err;
	});
