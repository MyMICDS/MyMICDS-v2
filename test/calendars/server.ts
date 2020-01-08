import express from 'express';
import * as http from 'http';
import { promisify } from 'util';

export const port = 42020;

const app = express();
app.use(express.static(__dirname));

const server = new http.Server(app);

export async function start() {
	return await promisify(server.listen.bind(server))(port);
}

export async function stop() {
	return await promisify(server.close.bind(server))();
}
