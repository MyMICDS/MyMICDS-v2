import { AliasType, MyMICDSClass } from '@mymicds/sdk';
import { Db, InsertOneWriteOpResult, ObjectID } from 'mongodb';
import { MyMICDSClassWithIDs } from './classes';
import * as classes from './classes';
import * as users from './users';

const aliasTypes: AliasType[] = Object.values(AliasType);

/**
 * Add an alias that points to a class object
 * @function addCanvasAlias
 *
 * @param {Object} db - Database object
 * @param {string} user - Username
 * @param {string} type - Valid alias type
 * @param {string} classString - Canvas class string
 * @param {string} classId - Native class ID
 * @param {addCanvasAliasCallback} callback - Callback
 */

/**
 * Callback after alias is created
 * @callback addCanvasAliasCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} aliasId - ID Object of alias inserted. Null if error.
 */

async function addAlias(db: Db, user: string, type: AliasType, classString: string, classId: string) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }
	if (!aliasTypes.includes(type)) { throw new Error('Invalid alias type!'); }
	if (typeof classString !== 'string') { throw new Error('Invalid class string!'); }
	if (typeof classId !== 'string') { await new Error('Invalid class id!'); }

	// Make sure valid user
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	// Check if alias already exists
	const { hasAlias } = await getAliasClass(db, user, type, classString);
	if (hasAlias) { throw new Error('Alias already exists for a class!'); }

	// Make sure class id is valid
	const theClasses = await classes.get(db, user);

	// Loop through classes and search for class with id specified
	let validClassObject: MyMICDSClassWithIDs | null = null;
	for (const classObject of theClasses) {
		if (classObject._id.toHexString() === classId) {
			validClassObject = classObject;
			break;
		}
	}

	if (!validClassObject) { throw new Error('Native class doesn\'t exist!'); }

	// Class is valid! Insert into database
	const insertAlias = {
		user: userDoc!._id,
		type,
		classNative: validClassObject._id,
		classRemote: classString
	};

	// Insert into database
	const aliasdata = db.collection('aliases');

	let results: InsertOneWriteOpResult;
	try {
		results = await aliasdata.insertOne(insertAlias);
	} catch (e) {
		throw new Error('There was a problem inserting the alias into the database!');
	}

	const insertedId: ObjectID = results.ops[0]._id;
	return insertedId;
}

/**
 * Returns an array of aliases registered under a specific user
 * @function listAliases
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {listAliasesCallback} callback - Callback
 */

/**
 * Returns an array of aliases
 * @callback listAliasesCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} aliases - An object containing a key for each alias type, and the value an array of the aliases. Null if error.
 */

async function listAliases(db: Db, user: string) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }
	if (typeof user !== 'string') { throw new Error('Invalid username!'); }

	// Make sure valid user
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	// Query database for all aliases under specific user
	const aliasdata = db.collection<AliasWithIDs>('aliases');

	let aliases;
	try {
		aliases = await aliasdata.find({ user: userDoc!._id }).toArray();
	} catch (e) {
		throw new Error('There was a problem querying the database!');
	}

	// Add array for all alias types
	const aliasList: Record<AliasType, AliasWithIDs[]> = {
		canvas: [] as AliasWithIDs[],
		portal: [] as AliasWithIDs[]
	};

	// Loop through aliases and organize them by type
	for (const alias of aliases) {
		// Make sure alias type exists
		if (aliasList[alias.type as AliasType]) {
			aliasList[alias.type as AliasType].push(alias);
		}
	}

	return aliasList;
}

/**
 * Returns a object containing aliases and their corresponding class object
 * @function mapAliases
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {mapAliasesCallback} callback - Callback
 */

/**
 * Returns an object containing Canvas and Portal aliases and their corresponding class objects
 * @callback mapAliasesCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} aliases - Two objects for Canvas and Portal aliases,
 * 							 which are also objects with key being alias and value being class object. If that makes any sense.
 */

async function mapAliases(db: Db, user: string) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }
	if (typeof user !== 'string') { throw new Error('Invalid username!'); }

	const [aliases, theClasses] = await Promise.all([
		listAliases(db, user),
		classes.get(db, user)
	]);

	const classMap: { [id: string]: MyMICDSClassWithIDs } = {};
	const aliasMap: Partial<Record<AliasType, { [id: string]: MyMICDSClassWithIDs }>> = {};

	// Organize classes by id
	for (const scheduleClass of theClasses) {
		classMap[scheduleClass._id.toHexString()] = scheduleClass;
	}

	// Organize aliases by native class id
	for (const type of Object.values(AliasType)) {
		aliasMap[type as AliasType] = {};

		if (typeof aliases[type as AliasType] !== 'object') { continue; }

		for (const aliasObject of aliases[type as AliasType]) {
			aliasMap[type as AliasType]![aliasObject.classRemote] = classMap[aliasObject.classNative.toHexString()];
		}
	}

	return aliasMap as Record<AliasType, { [id: string]: MyMICDSClassWithIDs }>;
}

/**
 * Deletes an alias
 * @function deleteAlias
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {string} type - Valid alias type
 * @param {string} aliasId - ID of alias
 * @param {deleteAliasCallback} callback - Callback
 */

/**
 * Returns whether or not there was an error deleting the alias
 * @callback deleteAliasCallback
 * @param {Object} err - Null if success, error object if failure.
 */

async function deleteAlias(db: Db, user: string, type: AliasType, aliasId: string) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }
	if (!aliasTypes.includes(type)) { throw new Error('Invalid alias type!'); }

	// Make sure valid alias
	const aliases = await listAliases(db, user);

	let validAliasId: ObjectID | null = null;
	for (const alias of aliases[type]) {
		if (aliasId === alias._id.toHexString()) {
			validAliasId = alias._id;
			break;
		}
	}

	if (!validAliasId) { throw new Error('Invalid alias id!'); }

	const aliasdata = db.collection('aliases');

	try {
		await aliasdata.deleteOne({ _id: validAliasId });
	} catch (e) {
		throw new Error('There was a problem deleting the alias from the database!');
	}
}

/**
 * Check if given class has a portal alias
 * @function getAliasClass
 *
 * @param {Object} db - Database object
 * @param {string} user - Username
 * @param {string} type - Alias type
 * @param {string} classInput - Class to check for an alias
 * @param {getAliasClassCallback} callback - Callback
 */

/**
 * Returns the corresponding class object, or whatever was inputted if there was no alias.
 * @callback getAliasClassCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Boolean} hasAlias - Whether or not there is an alias for the specific string. Null if error.
 * @param {string} classObject - Class object if alias found, otherwise inputted class if none found. Null if error.
 */

async function getAliasClass(db: Db, user: string, type: AliasType, classInput: string) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }
	if (!aliasTypes.includes(type)) { throw new Error('Invalid alias type!'); }

	// If class input is invalid, just return current value in case it is already a class object
	if (typeof classInput !== 'string') { return { hasAlias: false, classObject: classInput }; }

	// Make sure valid user
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	const aliasdata = db.collection<AliasWithIDs>('aliases');

	let aliases: AliasWithIDs[];
	try {
		aliases = await aliasdata.find({ user: userDoc!._id, type, classRemote: classInput }).toArray();
	} catch (e) {
		throw new Error('There was a problem querying the database!');
	}

	if (aliases.length === 0) { return { hasAlias: false, classObject: classInput }; }

	const classId = aliases[0].classNative;

	// Now get class object
	const theClasses = await classes.get(db, user);

	// Search user's classes for valid class id
	for (const classObject of theClasses) {
		if (classId.toHexString() === classObject._id.toHexString()) {
			return { hasAlias: true, classObject };
		}
	}

	// There was no valid class
	return { hasAlias: false, classObject: classInput };
}

/**
 * Deletes all aliases that are not linked to any class
 * @function deleteClasslessAliases
 *
 * @param {Object} db - Databse connection
 * @param {deleteClasslessAliasesCallback} callback - Callback
 */

/**
 * Returns an error if any. Also has extremely long name.
 * @callback deleteClasslessAliasesCallback
 *
 * @param {Object} err - Null if success, error object if failure
 */

async function deleteClasslessAliases(db: Db) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }

	const aliasdata = db.collection<AliasWithIDs>('aliases');

	let classless: AliasWithIDs[];

	try {
		classless = await aliasdata.aggregate([
			// Stage 1
			{
				$lookup: {
					from: 'classes',
					localField: 'classNative',
					foreignField: '_id',
					as: 'classes'
				}
			},
			// Stage 2
			{
				$match: {
					classes: {
						$size: 0
					}
				}
			}
		]).toArray();
	} catch (e) {
		throw new Error('There was a problem querying the database!');
	}

	try {
		await Promise.all(classless.map(alias => aliasdata.deleteOne({ _id: alias._id, user: alias.user })));
	} catch (e) {
		throw new Error('There was a problem deleting aliases in the database!');
	}
}

export interface AliasWithIDs {
	_id: ObjectID;
	user: ObjectID;
	type: AliasType;
	classNative: ObjectID;
	classRemote: string;
}

export {
	addAlias as add,
	listAliases as list,
	mapAliases as mapList,
	deleteAlias as delete,
	getAliasClass as getClass,
	deleteClasslessAliases
};
