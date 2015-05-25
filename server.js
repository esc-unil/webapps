'use strict';
/**
 * Created by tpineau
 *
 */

var express = require('express');
var cors = require('cors');

var mongo = require ('./apps/mongo.js');
var hostnames = require ('./apps/hostnames.js');


var app = express();
app.use(cors());


app.get('/websearch', function(req, res) {mongo.run(req.query, res);});

app.get('/websearch/hostnames', function(req, res) {hostnames.run(req.query, res);});


app.listen(3000);

