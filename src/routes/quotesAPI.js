/// dependencies
// express
// fs
// request
// body-parser

var fs = require("fs");
var request = require('request');

module.exports = function(app, db) {
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
  var title = req.body.title;
  var date = new Date();

  var submit = req.body.contents + " - " + author;

  // submit to requests file
  var insertDocument = function(db, callback) {
   db.collection('restaurants').insertOne( {
      "address" : {
         "street" : "2 Avenue",
         "zipcode" : "10075",
         "building" : "1480",
         "coord" : [ -73.9557413, 40.7720266 ]
      },
      "borough" : "Manhattan",
      "cuisine" : "Italian",
      "grades" : [
         {
            "date" : new Date("2014-10-01T00:00:00Z"),
            "grade" : "A",
            "score" : 11
         },
         {
            "date" : new Date("2014-01-16T00:00:00Z"),
            "grade" : "B",
            "score" : 17
         }
      ],
      "name" : "Vella",
      "restaurant_id" : "41704620"
   }, function(err, result) {
    assert.equal(err, null);
    console.log("Inserted a document into the restaurants collection.");
    callback();
  });
};

db.connect('mongodb://mymicds-client:1amAcli3nt@45.56.70.141:27017/mymicds-userdata', function(err, db) {
  assert.equal(null, err);
  insertDocument(db, function() {
      db.close();
  });
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
