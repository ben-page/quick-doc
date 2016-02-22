'use strict';
var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var File = require('./file');

var readFile = Promise.promisify(fs.readFile);
var readDir = Promise.promisify(fs.readdir);
var stat = Promise.promisify(fs.lstat);
var writeFile = Promise.promisify(fs.writeFile);
var mkdir = Promise.promisify(fs.mkdir);

function fatalError(message) {
    console.error(message);
    process.exit(1);
}

function DocMe(rootPath, options) {
    this.rootPath = rootPath;
    this.options = options || {};
    this.files = {};

    if (!this.options.outputPath)
        this.options.outputPath = 'docs';
}

DocMe.prototype.go = function() {
    //make sure rootPath is a directory
    var rootPath = this.rootPath;
    this.rootPath = path.resolve(path.dirname(this.rootPath));
    return this.read(rootPath);
};

DocMe.prototype.read = function(filePath) {
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

function mapObject(obj, mapper) {
    var promises = [];
    for (var prop in obj)
        promises.push(mapper(prop, obj[prop]));

    return Promise.all(promises);
}

DocMe.prototype._createPath = function(filePath) {
    var split = path.dirname(path.relative(this.rootPath, filePath)).split(path.sep);
    var checkPath = this.rootPath;

    return Promise.each(split, function(dir) {
        checkPath = path.join(checkPath, dir);

        return mkdir(checkPath)
            .catch(function(err) {
                //ignore error, directory probably exists
            });
    });
};

DocMe.prototype._writeFile = function(filePath, content) {
    return this._createPath(filePath)
        .then(function() {
            return writeFile(filePath, content);
        });
};

DocMe.prototype.build = function() {
    var self = this;

    //console.log(JSON.stringify(this.files, null, 2));
    var docPath = path.join(this.rootPath, this.options.outputPath);
    var cssPath = path.join(docPath, 'css');
    var assetsPath = path.join(docPath, 'assets');

    return Promise.join(
        readFile('templates/assets/Roboto.woff2'),
        readFile('templates/assets/RobotoMono.woff2'),
        readFile('templates/css/default.css', 'utf8'),
        readFile('node_modules/normalizecss/normalize.css', 'utf8'),
        readFile('node_modules/highlight.js/styles/darkula.css', 'utf8'),
        readFile('templates/page.html', 'utf8'),
        function(roboto, robotoMono, defaultCss, normalizeCss, darkulaCss, template) {

            return [
                self._writeFile(path.join(assetsPath, 'Roboto.woff2'), roboto),
                self._writeFile(path.join(assetsPath, 'RobotoMono.woff2'), robotoMono),
                self._writeFile(path.join(cssPath, 'default.css'), defaultCss),
                self._writeFile(path.join(cssPath, 'normalize.css'), normalizeCss),
                self._writeFile(path.join(cssPath, 'darkula.css'), darkulaCss),
                mapObject(self.files, function (filePath, file) {
                    var uniquePath = path.relative(self.rootPath, filePath);
                    var outputPath = path.join(docPath, uniquePath);
                    var i = outputPath.lastIndexOf('.');
                    if (i > -1)
                        outputPath = outputPath.substr(0, i);
                    outputPath += '.html';

                    var padLength = file.comments.length.toString().length;
                    var numberPadding = new Array(padLength - 1).fill(' ').join('');
                    var numberPadding2 = new Array(4).fill(' ').join('');

                    var content = '';
                    var codeLineNo = 0, comment, code;
                    for (i = 0; i < file.comments.length; i++) {
                        comment = file.comments[i];

                        content += '<div class="table-row">';
                        if (comment === null) {
                            content += '<div class="comment blank">&nbsp;</div>';
                        } else {
                            if (comment === '')
                                comment = ' ';
                            content += '<div class="comment">' + comment + '</div>';
                        }

                        code = file.codeLines[i];
                        if (code === null) {
                            content += '<div class="code">&nbsp;</div>';
                        } else {
                            content += '<div class="code">' + numberPadding.substring(0, padLength - codeLineNo.toString().length) + codeLineNo + numberPadding2 + code + '</div>';
                            codeLineNo++;
                        }
                        content += '</div>';
                    }

                    var html = template.replace(/\{title\}/g, uniquePath);
                    html = html.replace(/\{css-path\}/g, path.relative(path.dirname(outputPath), cssPath).replace(path.sep, '/'));
                    html = html.replace('{index}', 'function1<br>function2<br>function3');
                    html = html.replace('{content}', content);

                    return self._writeFile(outputPath, html);
                })
            ];
        });
};

module.exports = function(rootPath, options) {
    var docMe = new DocMe(rootPath, options);
    return docMe.go()
        .then(function() {
            return docMe.build();
        });
};