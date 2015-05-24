'use strict';
/**
 * Created by tpineau
 *
 */

var async = require('async');
var mongoClient = require('mongodb').MongoClient;

var monitoring = require('./db.json');

function run(database, col, target){
//
    var login = '';
    if (monitoring.mongoDB.user != '' && monitoring.mongoDB.password != ''){
        login = monitoring.mongoDB.user + ':' + monitoring.mongoDB.password;
    }
    var mongoPath = 'mongodb://' + login + monitoring.mongoDB.domain + ':' + monitoring.mongoDB.port + '/' + database;
    mongoClient.connect(mongoPath, function(err, db) {
        if (err){console.log(err);}
        else {
            var i = 1;
            async.eachSeries(
                platforms,
                function (platform, cb){
                    platform.getURL(db, col, target, function(err){
                        if (err) {console.log(err);}
                        console.log('Platform ' + i.toString() + '/' + platforms.length.toString());
                        i++;
                        cb();
                    });
                },
                function (){
                    db.close();
                    console.log('done');
                }
            )
        }
    });
}