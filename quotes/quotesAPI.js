var express = require('express');
var fs = require("fs");
var request = require('request');
var bodyParser = require('body-parser');

var app = express();

// CORS headers and other
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// test
app.get('/quotes/test', function (req, res){
  res.end("QuotesAPI Test: Hello!");
});

// get quote
app.post('/quotes/get', function (req, res) {
  /// params: type
  var type = req.body.type;

  if (type == "rand") {

  }
  else if (type == "day") {

  }
  else {
    res.end("Not valid POST");
  }
  res.end("Success!");
});

// submit a quote
app.post('/quote/submit', function (req, res) {
  var author = req.body.author;
  var contents = req.body.contents;
  var date = new Date().getDate();

  var submit = "From: " + author + ": " + contents + " @[" + date + "]";

  // submit to requests file
  fs.writeFile(__dirname + "/quotes_data/archive/submits.txt", submit, function (err){
    if (err) {
      console.log("Error Writing to File! #BeginSubmit: " + submit + " #EndSubmit");
    }
  });
  res.end("Submission Success!");
});

// open port
var server = app.listen(1511, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log("App listening at http://localhost", host, port);
})
