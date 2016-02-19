'use strict';
var util = require('util');

//extra comment

/**
 * JSDOC comment
 * @param object
 */
function test(object) {
    console.log(util.inspect(object));

    //line comment
    for (var i = 0; i < 100; i++) {
        console.log(i);
    }

    //even if
    //they push
    //down the
    //rest of
    //the code
    for (var f = 0; f < 100; f++) {
        console.log(f);
    }

}

/*
block comment
 */
test(util);

var t = 0;