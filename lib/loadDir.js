'use strict';
var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var mm = require('micromatch');

var readFile = Promise.promisify(fs.readFile);
var readDir = Promise.promisify(fs.readdir);
var stat = Promise.promisify(fs.lstat);

function error(message) {
    console.error(message);
    process.exit(1);
}

function DirectoryLoader(include, exclude) {
    this.include = include;
    this.exclude = exclude;
    this.files = {};
}

DirectoryLoader.prototype.read = function(filePath) {
    var self = this;

    return stat(filePath)
        .then(function (stats) {
            if (stats.isDirectory())
                return self.readDir(filePath);

            return self.readFile(filePath);
        })
        .catch(function(err) {
            console.error('Failed to open file \"' + filePath + '\". ' + err.message);
        });
};

DirectoryLoader.prototype.readDir = function(dirPath) {
    var self = this;

    if (this.exclude && mm.any(dirPath, this.exclude))
        return;

    return readDir(dirPath)
        .then(function (files) {

            return Promise.map(files, function(filePath) {
                return self.read(path.join(dirPath, filePath));
            });
        })
        .catch(function(err) {
            console.error('Failed to read dir \"' + dirPath + '\". ' + err.message);
        });
};

DirectoryLoader.prototype.readFile = function(filePath) {
    var self = this;

    if (this.include && !mm.any(filePath, this.include))
        return;

    if (this.exclude && mm.any(filePath, this.exclude))
        return;

    var encoding;
    switch (path.extname(filePath)) {
        case '.js':
        case '.css':
        case '.html':
        case '.htm':
            encoding = 'utf8';
            break;
    }

    return readFile(filePath, {encoding: encoding})
        .then(function (text) {
            self.files[filePath] = text;
        })
        .catch(function(err) {
            console.error('Failed to read file \"' + filePath + '\". ' + err.message);
        });
};

module.exports = function loadDir(dirPath, include, exclude) {
    var directoryLoader = new DirectoryLoader(include, exclude);
    return directoryLoader
        .read(dirPath)
        .then(function() {
            return directoryLoader.files;
        });
};