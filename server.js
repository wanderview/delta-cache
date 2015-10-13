'use strict';

var express = require('express');
var serveStatic = require('serve-static');
var compression = require('compression');

var app = express();

app.use(compression({ filter: function(req, res) { return true; } }));
app.use(serveStatic('.', { index: 'index.html' }));

app.listen(3000);
