# MyMICDS-v2
MyMICDS.net for all of your MyMICDS.needs

## Setup

### Dependencies
To start development on MyMICDS-v2, first run `npm install` in the main project directory.
This will install all the runtime dependencies (including TypeScript) as well as TypeDoc, TSLint, and all the other development dependencies.

### Configuration
A local config file is required on every machine you develop on. This stores sensitive information such as database credentials and API keys.
Copy `src/libs/config.example.ts` into a new file called `config.ts` with the proper information filled out as described in the example.
This file is included in `.gitignore`, so you don't have to worry about accidentally committing the credentials.

### Usage
To start the server for development, run `npm start`. In a production environment, run `npm run prod`. 

#### Tasks Server
To start the tasks server, run `npm run tasks`.

#### For Development
If you would like the server to restart on file changes, install [`nodemon`](https://nodemon.io/) and simply run `nodemon` in the project root.

### Documentation
Run `npm run docs` to build documentation. TypeDoc will generate documentation based on comments and type structures and dump it into the `/docs/` folder.
This creates static HTML files, so you'll have to open them manually in your browser.


## Other Repositories

### [MyMICDS-v2-Angular](https://github.com/MyMICDS/MyMICDS-v2-Angular)
The Angular front-end for MyMICDS.

### [MyMICDS-SDK](https://github.com/MyMICDS/MyMICDS-SDK)
The official TypeScript client for connecting to MyMICDS. Automatically handles API requests using RxJS.

### [MyMICDS-WatchFace](https://github.com/MyMICDS/MyMICDS-WatchFace)
A Wear OS watch face featuring MyMICDS integration.


## Contact
Wanna become a developer on the MyMICDS.net team? Shoot us an email at [support@mymicds.net](mailto:support@mymicds.net)!
We accept anyone and everyone, so don't be shy!

For any other questions, comments, concerns, or suggestions, you can also contact support@mymicds.net.
