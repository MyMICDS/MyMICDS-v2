/// dependencies
// express
// fs
// request
// body-parser

var fs = require("fs");
var request = require('request');
var app = express();

module.exports = function(app) {
// get current current authkey
global.postauthkey = "98k86h643h2k";

// CORS headers and other
/*app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));*/

console.log("Ready!");

// test
app.get('/quotes/test', function (req, res){
  res.end("QuotesAPI Test: Hello!");
});

// get quote
app.post('/quotes/get', function (req, res) {
  /// params: type, authkey
  var type = req.body.type;
  var auth = req.body.authkey;

  if (type == "rand" && auth == global.postauthkey) {

    // read archive
    fs.readFile(__dirname + "../libs/quotes_data_archive/stored_quotes.json", "utf8", function read(err, data) {
      var storedQuotesRaw = JSON.parse(data);

      // pick a random quote and send it
      var randomNumber = Math.floor((Math.random() * (parseInt(JSON.parse(data).indexInfo.index))));
      res.send(JSON.parse(data).quoteArchive.quotes[randomNumber] + " - " + JSON.parse(data).quoteArchive.authors[randomNumber] + "\n" + " (Submitted on: " + JSON.parse(data).quoteArchive.dates[randomNumber] + ")");

      if (err) {
        console.log("Read Error!");
      }
    });
  }
  else if (type == "day" && auth == global.postauthkey) {
    res.send("Successful Day Paramater POST! No content yet");
  }
  else if (auth != global.postauthkey) {
    res.send("403 Not a Valid Authorization POST Key");
  }
  else {
    res.send("Not valid POST Request!");
  }
});

// submit a quote
app.post('/quote/submit', function (req, res) {
  var author = req.body.author;
  var contents = req.body.contents;
  var date = new Date();

  var submit = "From: " + req.body.author + ": " + req.body.contents + " @[" + date + "]" + "\n";

  // submit to requests file
  fs.appendFile(__dirname + "../libs/quotes_data_archive/submits.txt", submit, function (err){
    if (err) {
      console.log("Error Writing to File! #BeginSubmit: " + submit + " #EndSubmit");
    }
  });
  res.send("Submission Success!");
});

// open port
/*
var server = app.listen(1511, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log("App listening at http://localhost", host, port);
})*/
}