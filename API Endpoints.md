# API Endpoints for MyMICDS.net
For pretty much anything interacting with the API, you'll send a HTTP POST request to the server. Here is a list of all the endpoints and what data you will receive. Different parts of the API are grouped with different files for organization.

Most of the API's return an `error` entry in the JSON. Most of the time, the error will be null. If an error does happen to occur, it will return a string, and the other inputs will be null.

Modules or 'libraries' are were the functionality and core of the of the website is at. Each module should be relatively short and do one job and do it well. **By themselves, modules do nothing. Modules are where the functionality is.**

Endpoints or 'routes' and different URL's that you can send information to. This usually plugs directly into the modules, or serves webpages to be viewed by the user. **Routes control the URLs and the information that passes through them. Routes are the bridge between the users and the functionality.**



# Table of Contents
* [Alias API](#alias-api)
  * [`/alias/add`](#aliasadd)
  * [`/alias/list`](#aliaslist)
  * [`/alias/delete`](#aliasdelete)
* [Background API](#background-api)
  * [`/background/get`](#backgroundget)
  * [`/background/upload`](#backgroundupload)
  * [`/background/delete`](#backgroundelete)
* [Canvas API](#canvas-api)
  * [`/canvas/test-url`](#canvastest-url)
  * [`/canvas/set-url`](#canvasset-url)
  * [`/canvas/get-events`](#canvasget-events)
  * [`/canvas/get-classes`](#canvasget-classes)
* [Class API](#class-api)
  * [`/classes/get`](#classesget)
  * [`/classes/add`](#classesadd)
  * [`/classes/delete`](#classesdelete)
* [Daily Bulletin API](#daily-bulletin-api)
  * [`/daily-bulletin/list`](#daily-bulletinlist)
* [Login API](#login-api)
  * [`/auth/login`](#authlogin)
  * [`/auth/logout`](#authlogout)
  * [`/auth/register`](#authregister)
  * [`/auth/confirm`](#authconfirm)
  * [`/auth/change-password`](#userchange-password)
  * [`/auth/forgot-password`](#userforgot-password)
  * [`/auth/reset-password`](#userreset-password)
* [Lunch API](#lunch-api)
  * [`/lunch/get`](#lunchget)
* [Planner API](#planner-api)
  * [`/planner/get`](#plannerget)
  * [`/planner/add`](#planneradd)
  * [`/planner/delete`](#plannerdelete)
* [Portal API](#portal-api)
  * [`/portal/test-url`](#portaltest-url)
  * [`/portal/set-url`](#portalset-url)
  * [`/portal/get-schedule`](#portalget-schedule)
  * [`/portal/get-classes`](#portalget-classes)
* [User API](#user-api)
  * [`/user/grad-year-to-grade`](#usergrad-year-to-grade)
  * [`/user/grade-to-grad-year`](#usergrade-to-grad-year)
  * [`/user/school-ends`](#userschool-ends)
  * [`/user/grade-range`](#usergrade-range)
  * [`/user/get-info`](#userget-info)
  * [`/user/change-info`](#userchange-info)
* [Notifications API](#notification-api)
  * [`/notification/get`](#notificationget)
* [Weather API](#weather-api)
  * [`/weather/get`](#weatherget)
* [Alias API](#alias-api)
  * [`/alias/create`](#aliascreate)
  * [`/alias/get`](#aliasget)



## Alias API
The part of the API that relates to class aliases. Can be found under `src/routes/aliasAPI.js`. The associated aliases module can be found under `src/libs/aliases.js`.

### `/alias/add`
Add a class alias.

#### Parameters
- `type` - What type of alias. ('canvas'|'portal')
- `classString` - Alias string from Canvas or Portal
- `classId` - Class ID to point alias to

#### Response
- `error` - Null if successful, string containing error if failure.
- `id` - Id of alias just inserted.


## `/alias/list`
List the aliases available to the user

#### Response
- `error` - Null if successful, string containing error if failure.
- `aliases` - Object with alias types as key, value is array of alias objects.


## `/alias/delete`
Deletes an existing alias

#### Parameters
- `type` - What type of alias. ('canvas'|'portal')
- `id` - Id of alias to delete.

#### Response
- `error` - Null if successful, string containing error if failure.



## Background API
The part of the API that relates to users' backgrounds. Can be found under `src/routes/backgroundAPI.js`. The associated backgrounds module can be found under `src/libs/backgrounds.js`.

### `/background/get`
Retrieve the URL of the background to display to the user.

#### Response
- `error` - Null if successful, string containing error if failure.
- `variants` - Object of background variations and their URL (Ex. 'normal' or 'blur')
- `hasDefault` - True if using default background, false if using upload background image.


### `/background/upload`
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


### `/canvas/get-classes`
**Requires user to be logged in.** Returns a list of Canvas classes the user has according to any events assigned on Canvas.

#### Response
- `error` - Null if successful, string containing error if failure.
- `classes` - Array of classes the user has.



## Class API
The part of the API relates to the classes. Can be found under `src/routes/classAPI.js`. The associated class and teacher module can be found under `src/libs/classes.js` and `src/libs/teachers.js`.


### `/classes/get`
**Requires user to be logged in.** This will return a list of classes the user has in the database.

#### Response
- `error` - Null if successful, string containing error if failure.
- `classes` - Array of classes the user has.


### `/classes/add`
**Requires user to be logged in.** Update/insert (also known as upsert) a class into the database.

#### Parameters
- `id` - Valid ID of class to edit. _(Optional, only send this if you want to edit a class.)_
- `name` - Name of class
- `color` - Associate a hex color while displaying the class. Please include a hash (#) at the beginning. The color can be three digits long (#XXX) or six digits long (#XXXXXX) _(Optional, if invalid or omitted, will default to a random hex color.)_
- `block` - What block the class takes place in. Please refer to `src/libs/classes.js` for a list of the valid blocks. _(Optional, defaults to block 'other'.)_
- `type` - What type of class. Please refer to `src/libs/classes.js` for a list of valid class types. _(Optional, defaults to type 'other'.)_
- `teacherPrefix` - Prefix the teacher goes by ('Mr.' or 'Ms.')
- `teacherFirstName` - First name of teacher
- `teacherLastName` - Last name of teacher

#### Response
- `error` - Null if success, string containing error if failure.
- `id` - Id of class inserted.


### `/classes/delete`
**Requires user to be logged in.** Delete a class with a certain id

### Parameters
- `id` - ID of class to delete

### Response
- `error` - Null if success, string containing error if failure.



## Daily Bulletin API
The part of the API that relates to the Daily Bulletin. Can be found in `src/routes/bulletinAPI.js`. This associated dailyBulletin module can be found under `src/libs/dailyBulletin.js`.


### `/daily-bulletin/list`
Gets an array of bulletin filenames from newest to oldest.

#### Response
- `error` - Null if success, string containing error if failure.
- `baseURL` - Base URL all Daily Bulletins are stored in.
- `bulletins` - Array of bulletins names from newest to oldest. Null if error.


## Login API
The part of the API that relates to the login system. Can be found in `src/routes/loginAPI.js`. The associated auth and jwt modules can be found under `src/libs/auth.js` and `src/libs/jwt.js`.

### `/auth/login`
If valid credentials are entered, it will log a user in by associating their session with a username.

#### Parameters
- `user` - Username to log into.
- `password` - Plaintext password to compare against the database.
- `remember` - If set to true, JSON Web Token will expire in 30 days compared to only 12 hours. _(Optional, by default it will be set to true.)_

#### Response
- `error` - Null if success, string containing error if failure.
- `success` - Whether or not the credentials were valid.
- `jwt` - String containing JSON Web Token to store on the client, and send in the header for every API request. Normal JWT will time out in 12 hours, or 30 days if 'remember' was set to true.


### `/auth/logout`
**Requires user to be logged in.** Will revoke JSON Web Token sent with the request.

#### Response
- `error` - Null if success, string containing error if failure.


### `/auth/register`
Will create a new user and send an email to confirm the user's account.

#### Parameters
- `user` - Username. This is the first part of a user's MICDS email, for example if you had the email `example@micds.org`, your username would be 'example'
- `password` - Plaintext password
- `firstName` - First name
- `lastName` - Last name
- `gradYear` - Year user graudates from high school.
- `teacher` - If teacher or faculty, give this any value. If set this will override any `grad-year` parameter. This matches the behavior of regular HTML checkboxes which will automatically set the value to 'on' if they are checked, and not submit any value if they are not checked. It will also ignore teacher if set to false. Overrides graduation year. _(Optional, by default user will not be a teacher.)_

#### Response
- `error` - Null if success, string containing error if failure.


### `/auth/confirm`
Confirm a newly registered account. Hash is sent via email.

#### Parameters
- `user` - Username of account to confirm.
- `hash` - Hash that was sent in the confirmation email.

#### Response
- `error` - Null if successful, string containing error if failure.



## Lunch API
This is the part of the API that relates to the lunch. Can be found in `src/routes/lunchAPI.js`. The associated lunch module can be found in `src/libs/lunch.js`.

### `/lunch/get`
Gets the lunch?

#### Parameters
- `year` - Year to get lunch from. _(Optional, defaults to current year.)_
- `month` - Month to get lunch from. _(Optional, defaults to current month.)_
- `day` - Day to get lunch from. _(Optional, defaults to current day.)_

#### Response
- `error` - Null if success, string containing error if failure.
- `lunch` - JSON object containing lunch for the week. **If there is no lunch for a specific day, then no object will be returned for that day. This means during breaks, this will be an empty object.**



## Planner API
This is the part of the API that relates to the planner. Can be found in `src/routes/plannerAPI.js`. The associated planner module can be found in `src/libs/planner.js`.


### `/planner/get`
**Requires user to be logged in.** Returns a list of events user has for a given month. **This also returns events from the previous and next month!** If a Canvas URL is set for the user, it will also include any Canvas events for the month. Refer to /canvas/get for retrieving only Canvas-related events.

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
- `classId` - Class ID to associate event with. _(Optional, defaults to null)_
- `start` - JavaScript date object containing starting date. _(Optional, defaults to current date.)_
- `end` - JavaScript date object containing starting date. _(Optional, defaults to current date.)_

#### Response
- `error` - Null if success, string containing error if failure.
- `id` - Id of event inserted.


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


### `/portal/get-classes`
**Requires user to be logged in.** Returns a list of Portal classes the user has according to their schedule.

#### Response
- `error` - Null if successful, string containing error if failure.
- `classes` - Array of classes the user has.



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
- `firstName` - What to change first name to. _(Optional, default will not change first name.)_
- `lastName` - What to change last name to. _(Optional, default will not change last name.)_
- `gradYear` - What to change graduation year to. _(Optional, default will not change graduation year.)_
- `teacher` - Whether user is teacher. If set to any value besides false, user will be changed to teacher. This overrides graduation year. _(Optional, default will not change to teacher.)_

### Response
- `error` - Null if success, string containing error if failure.


### `/user/change-password`
**Requires user to be logged in.** Change user's password.

#### Parameters
- `oldPassword` - Old password to confirm it's actual user.
- `newPassword` - New password to change to.

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

## Notifications API
This is the part of the API that relates to the sidebar notifications. Can be found under `src/routes/notificationAPI.js`. The associated notification module can be found under `src/libs/notification.js`.

### `/notification/get`
Get the list of notifications.

#### Parameters

#### Response
- `events` - List of notifications

## Weather API
This is the part of the API that relates to the weather at MICDS. Can be found under `src/routes/weatherAPI.js`. The associated weather module can be found under `src/libs/weather.js`.

### `/weather/get`
Get the available weather data for MICDS.

#### Parameters

#### Response
- `error` - Null if success, string containing error if failure.
- `weather` - JSON object with the weather if success, null if failure.
