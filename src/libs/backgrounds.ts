import { Db } from 'mongodb';
import { InputError } from './errors';
import { promisify } from 'util';
import { UserDoc } from './users';
import * as fs from 'fs-extra';
import * as Jimp from 'jimp';
import * as path from 'path';
import config from './config';
import multer from 'multer';

// Valid MIME Types for image backgrounds
const validMimeTypes: { [mime: string]: string } = {
	'image/png': 'png',
	'image/jpeg': 'jpg'
};
// These are only for finding what kind of image the user has saved.
// This DOES NOT check whether an uploaded image is valid! Configure that via MIME Types!
const validExtensions = ['.png', '.jpg'];

// Where public accesses backgrounds
const userBackgroundUrl = config.hostedOn + '/user-backgrounds';
// Where to store user backgrounds
export const userBackgroundsDir = __dirname + '/../public/user-backgrounds';
// Default user background
const defaultBackgroundUser = 'default';
const defaultExtension = '.jpg';

export const defaultPaths = {
	normal: userBackgroundsDir + '/' + defaultBackgroundUser + '/normal' + defaultExtension,
	blur: userBackgroundsDir + '/' + defaultBackgroundUser + '/blur' + defaultExtension
};

const defaultVariants = {
	normal: userBackgroundUrl + '/' + defaultBackgroundUser + '/normal' + defaultExtension,
	blur: userBackgroundUrl + '/' + defaultBackgroundUser + '/blur' + defaultExtension
};

// How many pixels to apply gaussian blur radius by default
const defaultBlurRadius = 10;

/**
 * Creates a function for uploading a user background.
 * @returns A function that can be used as Express middleware or independently.
 */
function uploadBackground() {
	const storage = multer.diskStorage({
		async destination(req, file, cb) {
			// Delete current background
			try {
				await deleteBackground(req.apiUser!);
			} catch (err) {
				cb(err, '');
				return;
			}

			// Make sure directory is created for user backgrounds
			const userDir = `${userBackgroundsDir}/${req.apiUser!}-${Date.now()}`;

			try {
				await fs.ensureDir(userDir);
				cb(null, userDir);
			} catch (err) {
				cb(new Error('There was a problem ensuring the image directory!'), '');
			}
		},
		filename(req, file, cb) {
			// Get valid extension
			const extension = validMimeTypes[file.mimetype];
			// Set base file name to username
			const filename = 'normal.' + extension;

			cb(null, filename);
		}
	});

	const upload = multer({
		storage,
		fileFilter(req, file, cb) {
			if (!req.apiUser) {
				cb(new Error('You must be logged in!'), false);
				return;
			}
			const extension = validMimeTypes[file.mimetype];
			// noinspection SuspiciousTypeOfGuard
			if (typeof extension !== 'string') {
				cb(new InputError('Invalid file type!'), false);
				return;
			}

			cb(null, true);
		}
	});

	return upload.single('background');
}

/**
 * Finds all the images associated with a user.
 * @param user Username.
 * @returns Path of image directory and the extension for the images.
 */
async function getCurrentFiles(user: string) {
	let userDirs: string[];
	try {
		userDirs = await fs.readdir(userBackgroundsDir);
	} catch (e) {
		throw new Error('There was a problem reading the user backgrounds directory!');
	}

	// Look through all the directories
	let userDir = null;
	for (const _dir of userDirs) {
		const dir = path.parse(_dir);
		const dirname = dir.name;
		const dirnameSplit = dirname.split('-');

		// Check directory isn't deleted
		if (dirnameSplit[0] === 'deleted') {
			continue;
		}

		// Get rid of timestamp and get name
		dirnameSplit.pop();

		// Directory owner's username (which may have dashes in it)
		const directoryOwner = dirnameSplit.join('-');

		// Check if background belongs to user
		if (directoryOwner === user) {
			userDir = dirname;
			break;
		}
	}

	// User doesn't have any background
	if (userDir === null) {
		return { dirname: null, extension: null };
	}

	const extension = await getDirExtension(userDir);

	return { dirname: userDir, extension };
}

/**
 * Deletes all of a user's background images.
 * @param user Username.
 */
async function deleteBackground(user: string) {
	// Find out user's current directory
	const { dirname, extension } = await getCurrentFiles(user);

	// Check if no existing background
	if (dirname === null || extension === null) {
		return;
	}

	const currentPath = userBackgroundsDir + '/' + dirname;
	const deletedPath = userBackgroundsDir + '/deleted-' + dirname;

	try {
		await fs.rename(currentPath, deletedPath);
	} catch (e) {
		throw new Error('There was a problem deleting the directory!');
	}
}

/**
 * Retrieves a user's background image.
 * @param user Username.
 * @returns All the different variants of a background image and whether or not it's the default background.
 */
async function getBackground(user: string | null): Promise<BackgroundObject> {
	if (typeof user !== 'string') {
		return { variants: defaultVariants, hasDefault: true };
	}

	// Get user's extension
	const { dirname, extension } = await getCurrentFiles(user);

	// Fallback to default background if no custom extension
	if (dirname === null || extension === null) {
		return { variants: defaultVariants, hasDefault: true };
	}

	const backgroundURLs = {
		normal: userBackgroundUrl + '/' + dirname + '/normal' + extension,
		blur: userBackgroundUrl + '/' + dirname + '/blur' + extension
	};

	return { variants: backgroundURLs, hasDefault: false };
}

/**
 * Retrieves the backgrounds of every single user.
 * @param db Database connection.
 * @returns Each user paired with their background variants.
 */
async function getAllBackgrounds(db: Db) {
	let userDirs: string[];
	try {
		userDirs = await fs.readdir(userBackgroundsDir);
	} catch (e) {
		throw new Error('There was a problem reading the user backgrounds directory!');
	}

	const userdata = db.collection<UserDoc>('users');

	let users: UserDoc[];
	try {
		users = await userdata.find({ confirmed: true }).toArray();
	} catch (e) {
		throw new Error('There was a problem querying the database!');
	}

	const remainingUsers = users.map(u => u.user);
	const result: { [user: string]: BackgroundObject } = {};

	for (const userDir of userDirs) {
		const dirname = path.parse(userDir).name;
		const dirnameSplit = dirname.split('-');

		if (dirnameSplit[0] === 'deleted' || dirnameSplit[0] === 'default') {
			continue;
		}

		// Remove timestamp
		dirnameSplit.pop();

		// User might have dashes in their name (i.e. bhollander-bodie)
		const user = dirnameSplit.join('-');

		const extension = await getDirExtension(dirname);

		if (!extension) {
			continue;
		}

		result[user] = {
			hasDefault: false,
			variants: {
				normal: `${userBackgroundUrl}/${dirname}/normal${extension}`,
				blur: `${userBackgroundUrl}/${dirname}/blur${extension}`
			}
		};
		// Remove user from list of people that don't have backgrounds
		remainingUsers.splice(remainingUsers.indexOf(user), 1);
	}

	for (const user of remainingUsers) {
		result[user] = {
			hasDefault: true,
			variants: defaultVariants
		};
	}

	return result;
}

/**
 * Gets the file extension of a user's background image.
 * @param userDir Name of directory containing background images.
 * @returns File extension.
 */
async function getDirExtension(userDir: string) {
	let userImages: string[];
	try {
		userImages = await fs.readdir(userBackgroundsDir + '/' + userDir);
	} catch (e) {
		throw new Error("There was a problem reading the user's background directory!");
	}

	// Loop through all valid files until there's either a .png or .jpg extention
	let userExtension: string | null = null;
	for (const _file of userImages) {
		const file = path.parse(_file);
		const extension = file.ext;

		// If valid extension, just break out of loop and return that
		if (validExtensions.includes(extension)) {
			userExtension = extension;
			break;
		}
	}

	return userExtension;
}

/**
 * Adds blur to an image.
 * @param fromPath Path to original image.
 * @param toPath Output path for blurred image.
 * @param blurRadius Gaussian blur radius to use.
 */
async function addBlur(fromPath: string, toPath: string, blurRadius: number) {
	let image: Jimp.Jimp;
	try {
		image = await Jimp.read(fromPath);
	} catch (e) {
		throw new Error('There was a problem reading the image!');
	}

	try {
		await promisify(image.blur(blurRadius).write.bind(image))(toPath);
	} catch (e) {
		throw new Error('There was a problem saving the image!');
	}
}

/**
 * Creates a blurred version of a user's background.
 * @param user Username.
 */
export async function blurUser(user: string) {
	const { dirname, extension } = await getCurrentFiles(user);

	if (dirname === null || extension === null) {
		return;
	}

	const userDir = userBackgroundsDir + '/' + dirname;
	const fromPath = userDir + '/normal' + extension;
	const toPath = userDir + '/blur' + extension;

	return addBlur(fromPath, toPath, defaultBlurRadius);
}

export interface BackgroundObject {
	variants: Record<'normal' | 'blur', string>;
	hasDefault: boolean;
}

export {
	getBackground as get,
	uploadBackground as upload,
	deleteBackground as delete,
	getAllBackgrounds as getAll
};
