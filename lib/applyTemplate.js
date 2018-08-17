'use strict';
const fs = require('fs');
const path = require('path');
const util = require('util');
const dust = require('dustjs-helpers');

const readDir = util.promisify(fs.readdir);
const stat = util.promisify(fs.lstat);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const copyFile = util.promisify(fs.copyFile);
const mkdir = util.promisify(fs.mkdir);
const dustRender = util.promisify(dust.render, dust);

async function safeWriteFile(rootPath, filePath, content) {
    const split = path.dirname(path.relative(rootPath, filePath)).split(path.sep);
    let checkPath = rootPath;

    for (const dir of split) {
        checkPath = path.join(checkPath, dir);

        try {
            await mkdir(checkPath);
        } catch (err) {
            if (err.code !== 'EEXIST')
                console.error(err.stack);
        }
    }

    await writeFile(filePath, content);
}

async function setupOutputDirectory(outputPath, templatePath) {
    try {
        await mkdir(outputPath);
    } catch (err) {
        if (err.code !== 'EEXIST')
            console.error(err.stack);
    }

    const entries = await readDir(templatePath);
    for (const entry of entries) {
        const entryPath = path.join(templatePath, entry);
        const stats = await stat(entryPath);

        const outputPath2 = path.join(outputPath, entry);

        if (stats.isDirectory()) {
            await setupOutputDirectory(outputPath2, entryPath);
        } else if (path.extname(entry) !== '.html') {
            await copyFile(entryPath, outputPath2, fs.constants.COPYFILE_FICLONE);
        }
    }
}

async function applyTemplate(template, files, rootPath, output, footer) {
    const templateText = await readFile(path.join(template, 'page.html'), 'utf8');
    const compiled = dust.compile(templateText);
    const pageTemplate = dust.loadSource(compiled);

    await setupOutputDirectory(output, template);

    for (const filePath in files) {
        const file = files[filePath];

        const relativePath = path.relative(rootPath, filePath);
        let fullPath = path.join(output, relativePath);

        let i = fullPath.lastIndexOf('.');
        if (i > -1)
            fullPath = fullPath.substr(0, i);
        fullPath += '.html';

        const content = {
            title: relativePath,
            rootPath: path.relative(path.dirname(fullPath), output).replace(path.sep, '/') || '.',
            lines: [],
            toc: 'function1<br>function2<br>function3<br>',
            footer
        };

        let codeLineNo = 0, line;
        for (i = 0; i < file.codeLines.length; i++) {
            line = {
                comments: file.comments[i],
                code: file.codeLines[i],
                lineNo: (i + 1)
            };

            content.lines.push(line);
        }

        const html = await dustRender(pageTemplate, content);
        await safeWriteFile(rootPath, fullPath, html);
    }
}

module.exports = applyTemplate;
