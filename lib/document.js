'use strict';
var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var loadDir = require('./loadDir');
var File = require('./file');
var dust = require('dustjs-helpers');

var writeFile = Promise.promisify(fs.writeFile);
var mkdir = Promise.promisify(fs.mkdir);

function error(message) {
    console.error(message);
    process.exit(1);
}

function Document(input, options) {
    if (!input)
        error('input is required');

    this.rootPath = path.resolve(path.dirname(input));
    this.input = input;
    this.output = options.output || path.join(this.rootPath, 'docs');
    this.template = options.template || path.join(__dirname, '..', 'template');
    this.exclude = options.exclude;
    this.footer = options.footer;

    this.files = {};
    this.templateFiles = {};
}

Document.prototype.go = function() {
    var self = this;

    //make sure rootPath is a directory

    return loadDir(this.input, '***/*.js', this.exclude)
        .then(function(files) {
            for (var filePath in files) {
                self.files[filePath] = new File(files[filePath]);
            }
        });
};

function mapObject(obj, mapper) {
    var promises = [];
    for (var prop in obj)
        promises.push(mapper(prop, obj[prop]));

    return Promise.all(promises);
}

Document.prototype._createPath = function(filePath) {
    var split = path.dirname(path.relative(this.rootPath, filePath)).split(path.sep);
    var checkPath = this.rootPath;

    return Promise.each(split, function(dir) {
        checkPath = path.join(checkPath, dir);

        return mkdir(checkPath)
            .catch(function() {
                //ignore error, directory probably exists
            });
    });
};

Document.prototype._writeFile = function(filePath, content) {
    return this._createPath(filePath)
        .then(function() {
            return writeFile(filePath, content);
        });
};

Document.prototype._processTemplate = function(template) {
    var compiled = dust.compile(template);
    var pageTemplate = dust.loadSource(compiled);

    var self = this;

    return mapObject(this.files, function (filePath, file) {
        var relativePath = path.relative(self.rootPath, filePath);
        var fullPath = path.join(self.output, relativePath);

        var i = fullPath.lastIndexOf('.');
        if (i > -1)
            fullPath = fullPath.substr(0, i);
        fullPath += '.html';

        var content = {
            title: relativePath,
            rootPath: path.relative(path.dirname(fullPath), self.output).replace(path.sep, '/') || '.',
            lines: [],
            toc: 'function1<br>function2<br>function3<br>',
            footer: self.footer
        };

        var codeLineNo = 0, line;
        for (i = 0; i < file.codeLines.length; i++) {
            line = {
                comments: file.comments[i],
                code: file.codeLines[i],
                lineNo: (i + 1)
            };

            content.lines.push(line);
        }

        return Promise
            .fromCallback(function(callback) {
                dust.render(pageTemplate, content, callback);
            })
            .then(function(html) {
                return self._writeFile(fullPath, html);
            });
    });
};

Document.prototype.build = function() {
    var self = this;

    return loadDir(this.template)
        .then(function (files) {
            return mapObject(files, function (filePath, text) {
                var relativePath = path.relative(self.template, filePath);
                var fullPath = path.join(self.output, relativePath);

                if (relativePath == 'page.html')
                    return self._processTemplate(text);

                return self._writeFile(fullPath, text);
            });
        });
};

module.exports = function document(input, options) {
    var document = new Document(input, options);
    return document.go()
        .then(function() {
            return document.build();
        });
};