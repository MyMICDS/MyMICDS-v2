import { initAPI } from './init';
import * as Sentry from '@sentry/node';
import config from './libs/config';

const port = process.env.PORT || config.port;

Sentry.init({
	dsn: 'https://7b1ca7e5c35043b3a79c69e83d4fd709@sentry.io/2721831',
	enabled: config.production
});

initAPI(config.mongodb.uri)
	.then(([app, , server]) => {
		app.get('/', (req, res) => {
			res.sendFile(__dirname + '/html/admin.html');
		});

		app.get('/start', (req, res) => {
			res.sendFile(__dirname + '/html/start.html');
		});

		app.get('/socket-io-test', (req, res) => {
			res.sendFile(__dirname + '/html/socket.html');
		});

		app.get('/spin', (req, res) => {
			res.sendFile(__dirname + '/html/spin.html');
		});

		/*
		 * Initialize Server
		 */

		server.listen(port, () => {
			console.log(`Server listening on *:${port}`);
		});
	})
	.catch((err: Error) => {
		console.error(`Error starting server: ${err.message}`);
		process.exit(1);
	});
