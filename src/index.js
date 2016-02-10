var http = require('http');
var https = require('https');

/* SSL */

/*
var credentials =
{
    key: fs.readFileSync('sslcert/server.key', 'utf8'),
    cert: fs.readFileSync('sslcert/server.crt', 'utf8'),
};
*/

/* Frameworks */

var express = require('express');
var app = express();
var server = http.Server(app);
// server = https.Server(app);

var io = require('socket.io')(server);

var port = 420;
server.listen(port, function() {
    console.log('Server listening on *:' + port);
});

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/html/index.html');
});