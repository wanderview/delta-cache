'use strict';

var express = require('express');
var serveStatic = require('serve-static');
var compression = require('compression');

var app = express();

app.use(compression({ filter: function(req, res) { return true; } }));
app.use(serveStatic('files', { index: false }));

app.listen(3000);
