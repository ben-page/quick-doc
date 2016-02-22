'use strict';
var program = require('commander');
var document = require('./doc');
var path = require('path');
var fs = require('fs');

program
    .version('0.0.1')
    .usage('[options] <input>')
    .option('-o, --output', 'output path (default is <input>/docs')
    .option('-t, --template [path]', 'path to template')
    .option('-e, --exclude', 'input files to exclude')
    .option('-ef, --footer', 'footer text')
    .option('-c, --config', 'json config file')
    .action(function (input) {
        if (!input)
            error('input is required');

        if (program.config) {
            fs.readFile(program.config, function (err, data) {
                if (err)
                    error('Reading config file failed: ' + err.message);

                var args;

                try {
                    args = JSON.parse(data);
                } catch (err) {
                    error('JSON.parse() failed: ' + err.message);
                }

                go(input, args);
            });
        } else {
            go(input, program);
        }

    })
    .parse(process.argv);

function error(message) {
    console.error(message);
    process.exit(1);
}

function go(input, args) {
    document(input, args)
        .then(function() {
            console.log('Complete!');
            process.exit(0);
        });
}