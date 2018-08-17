'use strict';
const fs = require('fs');
const path = require('path');
const util = require('util');
const mm = require('micromatch');

const readDir = util.promisify(fs.readdir);
const stat = util.promisify(fs.lstat);

async function getSourceFiles(file, include, exclude) {
    let stats;
    try {
        stats = await stat(file);

    } catch (err) {
        console.error(`Failed to open file "${file}".`);
        throw err;
    }

    if (stats.isDirectory())
        return await getSourceFileFromDirectory(file, include, exclude);

    //check file inclusions and exclusions
    if (include && !mm.any(file, include))
        return [];

    if (exclude && mm.any(file, exclude))
        return [];

    return [file];
}

async function getSourceFileFromDirectory(dir, include, exclude) {
    if (exclude && mm.any(dir, exclude))
        return [];

    let entries;
    try {
        entries = await readDir(dir);

    } catch (err) {
        console.error(`Failed to read dir "${dir}".`);
        throw err;
    }

    const files = [];
    for (const entry of entries) {
        const file = path.join(dir, entry);
        const files2 = await getSourceFiles(file, include, exclude);
        files.push(...files2);
    }

    return files;
}

module.exports = getSourceFiles;
