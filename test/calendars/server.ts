import { promisify } from 'util';
import * as http from 'http';
import express from 'express';

export const port = 42020;

const app = express();
app.use(express.static(__dirname));

const server = new http.Server(app);

export async function start() {
	return promisify(server.listen.bind(server))(port);
}

export async function stop() {
	return promisify(server.close.bind(server))();
}
