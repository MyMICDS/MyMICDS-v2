import { AliasType, PortalClass } from '@mymicds/sdk';
import { Db, ObjectId } from 'mongodb';
import { InputError, InternalError } from './errors';
import * as classes from './classes';
import * as users from './users';

/**
 * Adds an alias that connects a remote class to a local class object.
 * @param db Database connection.
 * @param user Username.
 * @param type Alias type to create.
 * @param classString String describing the remote class.
 * @param classId ID of the local class.
 * @returns ID of the inserted alias.
 */
async function addAlias(
	db: Db,
	user: string,
	type: AliasType,
	classString: string,
	classId: string
) {
	// Make sure valid user
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) {
		throw new Error("User doesn't exist!");
	}

	// Check if alias already exists
	const { hasAlias } = await getAliasClass(db, user, type, classString);
	if (hasAlias) {
		throw new Error('Alias already exists for a class!');
	}

	// Make sure class id is valid
	const theClasses = await classes.get(db, user);

	// Loop through classes and search for class with id specified
	let validClassObject: classes.MyMICDSClassWithIDs | null = null;
	for (const classObject of theClasses) {
		if (classObject._id.toHexString() === classId) {
			validClassObject = classObject;
			break;
		}
	}

	if (!validClassObject) {
		throw new Error("Native class doesn't exist!");
	}

	// Class is valid! Insert into database
	const insertAlias = {
		user: userDoc!._id,
		type,
		classNative: validClassObject._id,
		classRemote: classString,
		_id: new ObjectId()
	};

	// Insert into database
	const aliasdata = db.collection<AliasWithIDs>('aliases');

	let results;
	try {
		results = await aliasdata.insertOne(insertAlias);
	} catch (e) {
		throw new InternalError(
			'There was a problem inserting the alias into the database!',
			e as Error
		);
	}

	return results.insertedId;
}

/**
 * Gets all aliases associated with a given user.
 * @param db Database connection.
 * @param user Username.
 * @returns Object containing all aliases for each alias type.
 */
async function listAliases(db: Db, user: string) {
	// Make sure valid user
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) {
		throw new Error("User doesn't exist!");
	}

	// Query database for all aliases under specific user
	const aliasdata = db.collection<AliasWithIDs>('aliases');

	let aliases;
	try {
		aliases = await aliasdata.find({ user: userDoc!._id }).toArray();
	} catch (e) {
		throw new InternalError('There was a problem querying the database!', e as Error);
	}

	// Add array for all alias types
	const aliasList: Record<AliasType, AliasWithIDs[]> = {
		canvas: [] as AliasWithIDs[],
		portal: [] as AliasWithIDs[]
	};

	// Loop through aliases and organize them by type
	for (const alias of aliases) {
		// Make sure alias type exists
		if (aliasList[alias.type]) {
			aliasList[alias.type].push(alias);
		}
	}

	return aliasList;
}

/**
 * Retrieves class objects associated with all of a user's aliases.
 * @param db Database connection.
 * @param user Username.
 * @returns Object containing all classes for each alias type.
 */
async function mapAliases(db: Db, user: string) {
	const [aliases, theClasses] = await Promise.all([listAliases(db, user), classes.get(db, user)]);

	const classMap: { [id: string]: classes.MyMICDSClassWithIDs } = {};
	const aliasMap: Partial<Record<AliasType, { [id: string]: classes.MyMICDSClassWithIDs }>> = {};

	// Organize classes by id
	for (const scheduleClass of theClasses) {
		classMap[scheduleClass._id.toHexString()] = scheduleClass;
	}

	// Organize aliases by native class id
	for (const type of Object.values(AliasType)) {
		aliasMap[type] = {};

		if (typeof aliases[type] !== 'object') {
			continue;
		}

		for (const aliasObject of aliases[type]) {
			aliasMap[type]![aliasObject.classRemote] =
				classMap[aliasObject.classNative.toHexString()];
		}
	}

	return aliasMap as Record<
		AliasType,
		{ [id: string]: classes.MyMICDSClassWithIDs | PortalClass }
	>;
}

/**
 * Deletes an alias.
 * @param db Database connection.
 * @param user Username.
 * @param type Type of alias to delete.
 * @param aliasId ID of alias to delete.
 */
async function deleteAlias(db: Db, user: string, type: AliasType, aliasId: string) {
	// Make sure valid alias
	const aliases = await listAliases(db, user);

	let validAliasId: ObjectId | null = null;
	for (const alias of aliases[type]) {
		if (aliasId === alias._id.toHexString()) {
			validAliasId = alias._id;
			break;
		}
	}

	if (!validAliasId) {
		throw new InputError('Invalid alias id!');
	}

	const aliasdata = db.collection('aliases');

	try {
		await aliasdata.deleteOne({ _id: validAliasId });
	} catch (e) {
		throw new InternalError(
			'There was a problem deleting the alias from the database!',
			e as Error
		);
	}
}

/**
 * Checks if a class has an associated alias and retrieves the associated class object.
 * @param db Database connection.
 * @param user Username.
 * @param type Type of alias to check for.
 * @param classInput Remote class name to search for.
 * @returns The class object corresponding to the given string, assuming there is a matching alias,
 * 			else returns the inputted class.
 */
async function getAliasClass(db: Db, user: string, type: AliasType, classInput: string) {
	// Make sure valid user
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) {
		throw new Error("User doesn't exist!");
	}

	const aliasdata = db.collection<AliasWithIDs>('aliases');

	let aliases: AliasWithIDs[];
	try {
		aliases = await aliasdata
			.find({ user: userDoc!._id, type, classRemote: classInput })
			.toArray();
	} catch (e) {
		throw new InternalError('There was a problem querying the database!', e as Error);
	}

	if (aliases.length === 0) {
		return { hasAlias: false, classObject: classInput };
	}

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
 * Deletes aliases that aren't linked to any class.
 * @param db Database connection.
 */
export async function deleteClasslessAliases(db: Db) {
	const aliasdata = db.collection<AliasWithIDs>('aliases');

	let classless: AliasWithIDs[];

	try {
		classless = await aliasdata
			.aggregate<AliasWithIDs>([
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
			])
			.toArray();
	} catch (e) {
		throw new InternalError('There was a problem querying the database!', e as Error);
	}

	try {
		await Promise.all(
			classless.map(alias => aliasdata.deleteOne({ _id: alias._id, user: alias.user }))
		);
	} catch (e) {
		throw new InternalError(
			'There was a problem deleting aliases in the database!',
			e as Error
		);
	}
}

export interface AliasWithIDs {
	_id: ObjectId;
	user: ObjectId;
	type: AliasType;
	classNative: ObjectId;
	classRemote: string;
}

export {
	addAlias as add,
	listAliases as list,
	mapAliases as mapList,
	deleteAlias as delete,
	getAliasClass as getClass
};
