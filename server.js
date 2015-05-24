'use strict';
/**
 * Created by tpineau
 *
 * node --harmony server.js
 */

var app = require('koa')();
var router = require('koa-router')();
var cors = require('koa-cors');

var mongo = require('./apps/mongo.js');


/*

router.get('/websearch/:db/:param', function *(next) {
 this.body = this.params;
 console.log(this.params);
});
*/



router.get('/websearch', function *(next) {
 this.body = this.query;
});


app.name = 'Web Intelligence - UNIL';
app.use(cors());
app.use(router.routes());
app.use(router.allowedMethods());
app.listen('3000');
