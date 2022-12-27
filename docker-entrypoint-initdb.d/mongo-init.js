db = db.getSiblingDB('mymicds-staging');

db.createUser({
	user: 'mymicds-stager',
	pwd: 'passtheword',
	roles: [{ role: 'readWrite', db: 'mymicds-staging' }]
});

db.createCollection('users');
