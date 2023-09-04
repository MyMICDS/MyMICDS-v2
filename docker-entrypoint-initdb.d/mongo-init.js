var db = connect('mongodb://root:passtherootword@localhost:27017/admin');

db = db.getSiblingDB('mymicds-staging'); // we can not use "use" statement here to switch db

db.createUser({
	user: 'mymicds-stager',
	pwd: 'passtheword',
	roles: [{ role: 'readWrite', db: 'mymicds-staging' }],
	passwordDigestor: 'server'
});
