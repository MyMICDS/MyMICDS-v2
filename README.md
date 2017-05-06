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
However, this is not completely necessary. Running `npm start` will launch a program called pm2, which does the same thing as Nodemon. However, pm2 makes the process run in the background. In order to view the console, use the command `npm run console`.


### MyMICDS API for Front-end and Mobile App
Documentation for the different JSON API endpoints [can be found here.](API Endpoints.md)

## Todo
- Angular front-end
- Mobile App
- Holiday Backgrounds
- Organize Daily Bulletin Archives by year
- Fetch other important emails to display besides Daily Bulletin?
- Email notification if something goes _really_ bad in the back-end, or an error keeps on occurring.
- MyMICDS Notes - Create a Google Doc or something for each class that everyone can collaborate on

## Module Ideas
- Snow day calculator
- Countdown with three modes
  - Until weekend
  - Until break
  - Until school ends
- TODO Bulletin point list
- Quick access add events to planner
- Embed Web 2.0 Calc
- Quick links (maybe user can customize link + icon?)

## Other Repositories
### [MyMICDS-v2-Angular](https://github.com/michaelgira23/MyMICDS-v2-Angular)
Angular front-end for the MyMICDS website.
### [MyMICDS-Mobile](https://github.com/michaelgira23/MyMICDS-Mobile)
MyMICDS-Mobile is for our hybrid mobile app. That means it runs on both iOS and Android.

## Contact
Wanna become a developer on the MyMICDS.net team? Shoot us an email at [support@mymicds.net](mailto:support@mymicds.net)! We'll pretty much accept anyone and everyone so don't be shy!

For any other questions, comments, concerns, or suggestions, you can also contact support@mymicds.net.

Join programming Club. (please) <!-- please -->
