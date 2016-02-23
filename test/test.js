'use strict';
var util = require('util');

//extra comment

/**
 * JSDOC comment
 * @param object
 */
function test(object) {
    //line comment
    console.log(util.inspect(object));

    for (var i = 0; i < 100; i++) {
        console.log(i); //embedded line comment
    }

    var t = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

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