# API Endpoints for MyMICDS.net
For pretty much anything interacting with the API, you'll send a HTTP POST request to the server. Here is a list of all the endpoints and what data you will receive. Different parts of the API are grouped with different files for organization.

Most of the API's return an `error` entry in the JSON. Most of the time, the error will be null. If an error does happen to occur, it will return a string, and the other inputs will be null.

Modules or 'libraries' are were the functionality and core of the of the website is at. Each module should be relatively short and do one job and do it well. **By themselves, modules do nothing. Modules are where the functionality is.**

Endpoints or 'routes' and different URL's that you can send information to. This usually plugs directly into the modules, or serves webpages to be viewed by the user. **Routes control the URLs and the information that passes through them. Routes are the bridge between the users and the functionality.**



## Background API
The part of the API that relates to users' backgrounds. Can be found under `src/routes/backgroundAPI.js`. The associated backgrounds module can be found under `src/libs/backgrounds.js`.

### `/background/get`
Retrieve the URL of the background to display to the user.

#### Parameters
- `variation` - Variation of background to get. (Ex. normal or blur) _(Optional, defaults to normal.)_

#### Response
- `error` - Null if successful, string containing error if failure.
- `url` - URL of background to display


### `/background/change`
**Requires user to be logged in.** Upload a new background picture for the user.

#### Parameters
- `background` - Background image to upload. Note that jQuery's .serialize() method does not deal with images.

#### Response
- `error` - Null if success, string containing error if failure.


### `/background/delete`
**Requires user to be logged in.** Delete the custom background of a user.

#### Response
- `error` - Null if success, string containing error if failure.



## Canvas API
The part of the API that relates to Canvas. Can be found under `src/routes/canvasAPI.js`. The associated canvas module can be found under `src/libs/canvas.js`.


### `/canvas/test-url`
This will test any given URL to see if it is a valid Canvas calendar feed.

#### Parameters
- `url` - A string containing the URL you want to test

#### Response
- `error` - Null if successful, string containing error if failure.
- `valid` - True if Canvas URL is valid, else a string containing what is wrong with the URL.
- `url` - Cleaned up URL to actually use.


### `/canvas/set-url`
**Requires user to be logged in.** This will test any given URL, and if valid, insert into the database.

#### Parameters
- `url` - A string containing the URL you want to set.

#### Response
- `error` - Null if successful, string containing error if failure.
- `valid` - True if Canvas URL is valid, else a string containing what is wrong with the URL.
- `url` - Cleaned up URL to actually use.


### `/canvas/get-events`
**Requires user to be logged in.** This will get any calendar events for a given month. _Refer to `/planner/get-events` if you also want to retrieve the events stored on MyMICDS.net._

#### Parameters
- `year` - Year to get events from. _(Optional, defaults to current year.)_
- `month` - Month to get events from. _(Optional, defaults to current month.)_

#### Response
- `error` - Null if successful, string containing error if failure.
- `hasURL` - Whether or not the user has set a Canvas URL in the database.
- `events` - Array of events from the given month. Null if usr does not have URL set in database.



## Class API
The part of the API relates to the classes. Can be found under `src/routes/classAPI.js`. The associated class and teacher module can be found under `src/libs/classes.js` and `src/libs/teachers.js`.


### `/classes/get`
**Requires user to be logged in.** This will return a list of classes the user has in the database.

#### Response
- `error` - Null if successful, string containing error if failure.
- `classes` - Array of classes the user has


### `/classes/add`
**Requires user to be logged in.** Update/insert (also known as upsert) a class into the database.

#### Parameters
- `id` - Valid ID of class to edit. _(Optional, only send this if you want to edit a class.)_
- `name` - Name of class
- `color` - Associate a hex color while displaying the class. Please include a hash (#) at the beginning. The color can be three digits long (#XXX) or six digits long (#XXXXXX) _(Optional, if invalid or omitted, will default to a random hex color.)_
- `block` - What block the class takes place in. Please refer to `src/libs/classes.js` for a list of the valid blocks. _(Optional, defaults to block 'other'.)_
- 'type' - What type of class. Please refer to `src/libs/classes.js` for a list of valid class types. _(Optional, defaults to type 'other'.)_
- 'teacher' - A JSON object containing information about the teacher.
- `teacher.prefix` - Prefix the teacher goes by ('Mr.', 'Ms.', or 'Dr.')
- `teacher.firstName` - First name of teacher
- `teacher.lastName` - Last name of teacher

#### Response
- `error` - Null if success, string containing error if failure.
- 'id' - Id of class inserted.


### `/classes/delete`
**Requires user to be logged in.** Delete a class with a certain id

### Parameters
- `id` - ID of class to delete

### Response
- `error` - Null if success, string containing error if failure.



### Daily Bulletin API
The part of the API that relates to the Daily Bulletin. Can be found in `src/routes/bulletinAPI.js`. This associated dailyBulletin module can be found under `src/libs/dailyBulletin.js`.


### `/daily-bulletin/get-list`
Gets an array of bulletin filenames from newest to oldest.

#### Response
- `error` - Null if success, string containing error if failure.
- `bulletins` - Array of bulletins from newest to oldest. Null if error.


## Login API
The part of the API that relates to the login system. Can be found in `src/routes/loginAPI.js`. The associated auth and cookie modules can be found under `src/libs/auth.js` and `src/libs/cookies.js`.

### `/auth/login`
If valid credentials are entered, it will log a user in by associating their session with a username.

#### Parameters
- `user` - Username to log into.
- `password` - Plaintext password to compare against the database.
- `remember` - Set the value to anything if you would like to generate a 'Remember Me' cookie. This matches the behavior of regular HTML checkboxes which will automatically set the value to 'on' if they are checked, and not submit any value if they are not checked. _(Optional, by default it will be set to true.)_

#### Response
- `error` - Null if success, string containing error if failure.
- `success` - Whether or not the credentials were valid.
- `cookie` - If `remember` was set to any value, `cookie` will be a JSON object containing information about the cookie. Otherwise, `cookie` will be null.
- 'cookie.selector' - The selector should be placed inside the cookie. It has a similar to a username.
- `cookie.token` - The token should also be plaecd inside the cookie. It has a similar behavior to a password because an encrypted version of the token is stored inside the database.
- `cookie.expires` - Date when the cookie expires. This can be parsed by a Javascript date object, or inserted directly into a cookie's 'expires' parameter.


### `/auth/logout`
**Requires user to be logged in.** Will log out a user and clear any 'Remember Me' cookie they have stored on their browser.

#### Response
- `error` - Null if success, string containing error if failure.


### `/auth/register`
Will create a new user and send an email to confirm the user's account.

#### Parameters
- `user` - Username. This is the first part of a user's MICDS email, for example if you had the email `example@micds.org`, your username would be 'example'
- `password` - Plaintext password
- `firstName` - First name
- `lastName` - Last name
- `grad-year` - Year user graudates from high school.
- `teacher` - If teacher or faculty, give this any value. If set this will override any `grad-year` parameter. This matches the behavior of regular HTML checkboxes which will automatically set the value to 'on' if they are checked, and not submit any value if they are not checked. It will also ignore teacher if set to false. Overrides graduation year. _(Optional, by default user will not be a teacher.)_

#### Response
- `error` - Null if success, string containing error if failure.


### `/confirm/:user/:hash`
**This is one of the few routes in these files that isn't technically part of the API. This is a normal HTTP GET request instead of POST.** This is the link that is sent in the email to confirm a user's account.

#### Parameters
The email will automatically replace :user will the username and :hash as a randomly generated string to confirm user received the email.
#### Response

Will direct the user accordingly and give any error.



## Planner API
This is the part of the API that relates to the planner. Can be found in `src/routes/plannerAPI.js`. The associated planner module can be found in `src/libs/planner.js`.


### `/planner/get`
**Requires user to be logged in.** Returns a list of events user has for a given month. **If a Canvas URL is set for the user, it will also include any Canvas events for the month.** Refer to /canvas/get for retrieving only Canvas-related events.

#### Parameters
- `year` - Year to get events from. _(Optional, defaults to current year.)_
- `month` - Month to get events from. _(Optional, defaults to current month.)_

#### Response
- `error` - Null if success, string containing error if failure.
- `events` - Array of events from a given month.


### `/planner/add`
**Requires user to be logged in.** Update/insert (also known as upsert) an event in user's planner.

#### Parameters
- `id` - Valid ID of event to edit. _(Optional, only send this if you want to edit an event.)_
- `title` - Name of event
- `desc` - Description of event. _(Optional, defaults to empty string.)_
- `class-id` - Class ID to associate event with. _(Optional, defaults to null)_
- `start-year` - Year to start event. _(Optional, defaults to current year.)_
- `start-month` - Month to start event. _(Optional, defaults to current month.)_
- `start-day` - Day to start event. _(Optional, defaults to current day.)_
- `end-year` - Year to end event. _(Optional, defaults to current year.)_
- `end-month` - Month to end event. _(Optional, defaults to current month.)_
- `end-day` - Day to end event. _(Optional, defaults to current day.)_

#### Response
- `error` - Null if success, string containing error if failure.
- 'id' - Id of event inserted.


### `/planner/delete`
**Requires user to be logged in.** Delete an event with a certain id

#### Parameters
- `id` - ID of event to delete

#### Response
- `error` - Null if success, string containing error if failure.



## Portal API
This is the part of the API that relates to the Portal. Can be found under `src/routes/portalAPI.js`. The associated portal module can be found under `src/libs/portal.js`.


### `/portal/test-url`
This will test any given URL to see if it is a valid Portal calendar feed.

#### Parameters
- `url` - A string containing the URL you want to test

#### Response
- `error` - Null if successful, string containing error if failure.
- `valid` - True if portal URL is valid, else a string containing what is wrong with the URL.
- `url` - Cleaned up URL to actually use.


### `/portal/set-url`
**Requires user to be logged in.** This will test any given URL, and if valid, insert into the database.

#### Parameters
- `url` - A string containing the URL you want to set

#### Response
- `error` - Null if successful, string containing error if failure.
- `valid` - True if Portal URL is valid, else a string containing what is wrong with the URL.
- `url` - Cleaned up URL to actually use.


### `/portal/get-schedule`
**Requires user to be logged in.** This will retrieve a user's schedule for a given date.

#### Parameters
- `year` - Year to get schedule from. _(Optional, defaults to current year.)_
- `month` - Month to get schedule from. _(Optional, defaults to current month.)_
- `day` - Day to get schedule from. _(Optional, defaults to current day.)_

### Response
- `error` - Null if successful, string containing error if failure.
- `schedule` - JSON object containing information about the user's day.
- `schedule.day` - What rotation day it is. (This will be an integer between inclusive 1 to 6, or null.)
- `schedule.classes` - An array of objects containing information about the user's classes for that day. This contains a date when the class starts, when the class ends, and the name of the class.
- `schedule.allDay` - This is an array of strings containing events that take place throughout the whole day, and have no specific time.



## User API
This is the part of the API that relates to the user. Can be found under `src/routes/userAPI.js`. The associated user module can be found under `src/libs/users.js`.

### `/user/grad-year-to-grade`
A little utility that convert a high school graduation year into a grade.

#### Parameters
- `year` - Class graduation year.

#### Response
- `grade` - Grade of class. If the grade is Junior-Kindergarten (JK) or Senior-Kindergarten (SK) then the respective -1 and 0 integers are returned.


### `/user/grade-to-grad-year`
A little utility that converts a grade into a high school graduation year.

#### Parameters
- `grade` - Grade of class. If you want to enter the grade Junior-Kindergarten (JK) or Senior-Kindergarten (SK) then insert the respective integers -1 and 0.

#### Response
- `year` - Class graduation year.


### `/user/school-ends`
Returns the date when school ends. During Summer, returns the date next school year ends.

#### Response
- `date` - Date when school ends. Last Friday of may at 11:30.


### `/user/grade-range`
Returns an array of school graduation years from Junior Kindergarten to 12th grade.

#### Response
- `gradYears` - Array of graduation years spanning K-12


### `/user/get-info`
**Requires user to be logged in.** Get basic information about the user such as name and grade. You can also get canvasURL and portalURL. If canvasURL or portalURL is not set, they will be null.

#### Response
- `error` - Null if success, string containing error if failure.
- `user` - Object containing basic information about the user.


### `/user/change-info`
**Requires user to be logged in.** Change basic information about the user including first name, last name, and graduation year.

#### Parameters
- `first-name` - What to change first name to. _(Optional, default will not change first name.)_
- `last-name` - What to change last name to. _(Optional, default will not change last name.)_
- `grad-year` - What to change graduation year to. _(Optional, default will not change graduation year.)_
- `teacher` - Whether user is teacher. If set to any value besides false, user will be changed to teacher. This overrides graduation year. _(Optional, default will not change to teacher.)_

### Response
- `error` - Null if success, string containing error if failure.


### `/user/change-password`
**Requires user to be logged in.** Change user's password.

#### Parameters
- `old-password` - Old password to confirm it's actual user.
- `new-password` - New password to change to.

#### Response
- `error` - Null if success, string containing error if failure.


### `/user/forgot-password`
Sends an email to a user if they forgot their password. **Does not actually change password at this point, just sends email.**

#### Parameters
- `user` - Username

#### Response
- `error` - Null if success, string containing error if failure.


### `/user/reset-password`
Resets a user's password after clicking on the link from email sent by `/user/forgot-password`.

#### Parameters
- `user` - Username.
- `password` - Plaintext password to change account to.
- `hash` - Random string embedded in link to confirm user received the email.

#### Response
- `error` - Null if success, string containing error if failure.
