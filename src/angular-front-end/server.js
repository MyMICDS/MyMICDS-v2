'use strict';

var port = process.env.PORT || 1421;

var express = require('express');
var app = express();

app.use(express.static('./'));

app.listen(port, function () {
  console.log('app listening on port ' + port + '!');
});