'use strict';
var util = require('util');

//multiple comments
/*
    that reference the same line
        respect indention
 */
/**
 * test() function
 * @param {object} param1 important value
 */
function test(param1) {
    //line comment
    console.log(util.inspect(param1));

    for (var i = 0; i < 100 /* embedded block comment */; i++) {
        console.log(i); //embedded line comment
    }

    var t = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

    //multiple
    //line
    //comments
    for (var f = 0; f < 100; f++) {
        console.log(f);
    }
}

/*
 block comment
 */
test(util);