'use strict';
const fs = require('fs');
const path = require('path');
const util = require('util');
const getSourceFiles = require('./getSourceFiles');
const applyTemplate = require('./applyTemplate');
const File = require('./File');

const readFile = util.promisify(fs.readFile);

async function createDocumentation(input, options) {
    for (const entry of input) {
        const files = await getSourceFiles(entry, '**/*.js', options.exclude);

        const sourceFiles = {};
        for (const file of files) {
            let encoding;

            switch (path.extname(file)) {
                case '.js':
                case '.css':
                case '.html':
                case '.htm':
                    encoding = 'utf8';
                    break;
                default:
                    encoding = undefined;
                    break;
            }

            let text;
            try {
                text = await readFile(file, {encoding});
            } catch (err) {
                console.error(`Failed to read file "${file}".`);
                throw err;
            }
            sourceFiles[file] = new File(text);
        }

        const rootPath = path.resolve(path.dirname(entry));
        await applyTemplate(
            options.template = path.join(__dirname, '..', 'template'),
            sourceFiles,
            rootPath,
            options.output || path.join(rootPath, 'docs'),
            options.footer);
    }
}

module.exports = createDocumentation;
