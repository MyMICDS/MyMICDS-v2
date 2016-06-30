# MyMICDS-v2
MyMICDS.net for all of your MyMICDS.needs

## Setup
### Dependencies
To start development on MyMICDS-v2, you must first run `npm update` in the main project directory. This downloads all the dependencies for the project.
### Config
You must also setup a config file locally on every machine you develop on. This stores credentials for the project including database credentials, api keys, etc. Refer to `src/libs/config.js.example` and copy that into a new file under `src/libs/config.js` with the proper information filled out in the JSON. The config file is included in the .gitignore, so you don't have to worry about accidentally committing the project's credentials.
### Start
You can type `node src/index.js` to start the server, and press `Ctrl + C` twice in order to exit.

Run `npm run docs` to build documentation.
#### For Development
In order for your back-end code to take affect in a node.js application, you must restart it. We recommend you install an npm package called Nodemon during development. It will automatically restart the application when it detects a change in one of the files. In order to install and run nodemon, type the following:
```
$ npm install -g nodemon
$ nodemon
```

## Todo
- Add basic profile management functions like change password, change background, etc.
- Daily Bulletin fetcher
- Angular front-end
- Mobile App

## Other Repositories
### [MyMICDS-Mobile](https://github.com/michaelgira23/MyMICDS-Mobile)
MyMICDS-Mobile is for our hybrid mobile app. That means it runs on both iOS and Android.

## Contact
Wanna become a developer on the MyMICDS.net team? Shoot us an email at [support@mymicds.net](mailto:support@mymicds.net)! We'll pretty much accept anyone and everyone so don't be shy!

For any other questions, comments, concerns, or suggestions, you can also contact support@mymicds.net.
