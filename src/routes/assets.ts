import { Application, default as e } from 'express';

export default (app: Application, express: typeof e) => {
	app.use(express.static(__dirname + '/../public'));
};
