import { promisify } from 'util';
import * as http from 'http';
import express from 'express';

export const port = 42020;

const app = express();
app.use(express.static(__dirname));

const server = new http.Server(app);

export function start() {
	return new Promise<void>(resolve => server.listen(port, resolve));
}

export function stop() {
	return promisify(server.close.bind(server))();
}
