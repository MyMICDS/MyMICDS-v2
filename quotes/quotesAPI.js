/// dependencies
// express
// fs
// request
// body-parser
// rng

var express = require('express');
var fs = require("fs");
var request = require('request');
var bodyParser = require('body-parser');

var app = express();

// current authkey:
global.postauthkey = "98k86h643h2k";

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
  var auth = req.body.authkey;

  if (type == "rand" && auth == global.postauthkey) {
    var archiveIndex;
    var archiveData;

    // read archive
    fs.readFile(__dirname + "/quotes_data_archive/stored_quotes.json", "utf8", function read(err, data) {
      archiveIndex = JSON.parse(data).indexInfo.index;
      archiveData = JSON.parse(data).quoteArchive;
      console.log(archiveIndex + ", " + archiveData);
    });

    // pick a random number

    res.send(archiveData[Math.random() * archiveData.length | 0].contents);
  }
  else if (type == "day" && auth == global.postauthkey) {
    res.end("Successful Paramater!");
  }
  else if (auth != global.postauthkey) {
    res.send("403 Not Valid Authorization POST Key");
  }
  else {
    res.send("Not valid POST");
  }
  res.send("Success!");
});

// submit a quote
app.post('/quote/submit', function (req, res) {
  var author = req.body.author;
  var contents = req.body.contents;
  var date = new Date();

  var submit = "From: " + req.body.author + ": " + req.body.contents + " @[" + date + "]" + "\n";

  // submit to requests file
  fs.appendFile(__dirname + "/quotes_data_archive/submits.txt", submit, function (err){
    if (err) {
      console.log("Error Writing to File! #BeginSubmit: " + submit + " #EndSubmit");
    }
  });
  res.send("Submission Success!");
});

// open port
var server = app.listen(1511, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log("App listening at http://localhost", host, port);
})
