import express from 'express';

export default (app: express.Application) => {
	app.use(express.static(__dirname + '/../public'));
};
