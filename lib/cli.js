'use strict';
var DocMe = require('./doc');

var docMe = new DocMe();
docMe
//    .read('c:/projects/node-orm/lib')
//    .read('c:/projects/node-orm/lib/server/Sync.js')
    .read('test.js')
    .then(function() {
        console.log(JSON.stringify(docMe.files, null, 2));
    });
