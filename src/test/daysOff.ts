// tslint:disable:no-console

import * as dates from '../libs/dates';

dates.getBreaks().then(breaks => {
	console.log(breaks);
}).catch(err => {
	throw err;
});
