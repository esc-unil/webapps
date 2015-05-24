'use strict';
/**
 * Created by tpineau
 *
 */


var express = require('express');
var cors = require('cors');

var mongo= require ('./apps/mongo.js');


var app = express();
app.use(cors({origin:'http://www.lactame.com'}));


app.get('/websearch', function(req, res) {mongo.run(req.query, function (a){res.json(a);});});


app.listen(3000);
