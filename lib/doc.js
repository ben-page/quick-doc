'use strict';
var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var File = require('./file');

var readFile = Promise.promisify(fs.readFile);
var readDir = Promise.promisify(fs.readdir);
var lstat = Promise.promisify(fs.lstat);

function fatalError(message) {
    console.error(message);
    process.exit(1);
}

function DocMe() {
    this.files = {};
}


// var packageJsonPath = path.join(basePath, 'package.json');
//
// fs.readFile(packageJsonPath, function(err, file) {
//     if (err)
//         return fatalError('Could not read ' + packageJsonPath + '. ' + err.message);
//
//     try {
//         var packageJson = JSON.parse(packageJsonPath);
//     } catch(err) {
//         return fatalError('Invalid package.json file. ' + err.message);
//     }
//
//     if (!packageJson.main)
//         return fatalError('package.json missing main.');
//
//
//
// });

DocMe.prototype.read = function(filePath) {
    var self = this;

    return lstat(filePath)
        .then(function (stats) {
            if (stats.isSymbolicLink())
                return;

            if (stats.isDirectory())
                return self.readDir(filePath);

            return self.readFile(filePath);
        })
        .catch(function(err) {
            console.error('Failed to open file \"' + filePath + '\". ' + err.message);
        });
};

DocMe.prototype.readDir = function(dirPath) {
    var self = this;

    return readDir(dirPath)
        .then(function (files) {

            return Promise.map(files, function(file) {
                return self.read(path.join(dirPath, file));
            });
        })
        .catch(function(err) {
            console.error('Failed to read dir \"' + dirPath + '\". ' + err.message);
        });
};

DocMe.prototype.readFile = function(filePath) {
    var self = this;

    return readFile(filePath, {encoding:'utf8'})
        .then(function (text) {
            self.files[filePath] = new File(text);
        })
        .catch(function(err) {
            console.error('Failed to read file \"' + filePath + '\". ' + err.message);
        });
};

module.exports = DocMe;