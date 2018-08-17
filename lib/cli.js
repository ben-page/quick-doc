/* eslint-disable no-process-exit */
'use strict';
const program = require('commander');
const createDocumentation = require('./createDocumentation');
const fs = require('fs');
const util = require('util');

const readFile = util.promisify(fs.readFile);

function error(message) {
    console.error(message);
    program.outputHelp();
    process.exit(1);
}

program
    .usage('[options] <input ...>')
    .option('-o, --output', 'output path (default is <input>/docs)')
    .option('-t, --template [path]', 'path to template')
    .option('-e, --exclude', 'input files to exclude')
    .option('-f, --footer', 'footer text')
    .option('-c, --config', 'json config file')
    .parse(process.argv);

if (!program.args)
    error('input is required');

(async function () {
    let options;
    if (program.config) {
        let data;
        try {
            data = await readFile(program.config);
        } catch (err) {
            error(`Reading config file failed: ${err.message}`);
        }

        try {
            options = JSON.parse(data);
        } catch (err) {
            error(`JSON.parse() failed: ${err.message}`);
        }

    } else {
        options = {
            output: program.output,
            template: program.template,
            exclude: program.exclude,
            footer: program.footer,
            config: program.config
        };
    }

    await createDocumentation(program.args, options);
    
    console.log('Complete!');
})();
