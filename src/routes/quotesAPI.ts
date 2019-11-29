import * as api from '../libs/api';
import * as quotes from '../libs/quotes';
import RoutesFunction from './routesFunction';

import * as Random from 'random-js';
const engine = Random.engines.mt19937().autoSeed();

export default ((app, db) => {

	app.get('/quote', async (req, res) => {
		try {
			const quotesResult = await quotes.get(db);
			const quote = Random.pick(engine, quotesResult);
			api.success(res, { quote });
		} catch (err) {
			api.error(res, err);
		}
	});

	app.post('/quote', async (req, res) => {
		try {
			await quotes.insert(db, req.body.author, req.body.quote);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

}) as RoutesFunction;
