'use strict';
var util = require('util');

//line comment

/**
 * JSDOC comment
 * @param object
 */
function test(object) {
    console.log(util.inspect(object));

    //it's important that blocks are propertly detected
    for (var i = 0; i < 100; i++) {
        console.log(i); //inline comment
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
