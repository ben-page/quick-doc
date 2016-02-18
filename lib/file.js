'use strict';
var esprima = require('esprima');

function File(text) {
    var expressions = esprima.parse(text, {
        loc: true,
        attachComment: true
    });

    text = text.replace('\r\n', '\n');
    this.lines = text.split('\n');

    this.comments = [];
    this.linesRemoved = 0;
    this.visit(expressions.body);
}

var REGULAR = 1;
var LINE = 2;
var JSDOC = 3;
var IGNORE = 4;

var isWhitespace = /^\s*$/;

File.prototype._isOnOwnLine = function(comment) {
    var start = comment.loc.start;

    if (start.column === 0)
        return true;
};

File.prototype.handleComments = function(comments, blockLoc) {
    var start = comments[0].loc.start;
    var end = comments[comments.length - 1].loc.end;

    var comment = {
        parts: [],
        start: start.line - 1 - this.linesRemoved,
        end: blockLoc.end.line - blockLoc.start.line
    };
    this.comments.push(comment);

    for (var i = 0; i < comments.length; i++) {
        comment.parts.push(comments[i].value);
    }

    var firstLine = comment.start;
    if (start.column !== 0) {
        var precedingText = this.lines[firstLine].substring(0, start.column);
        isWhitespace.index = 0;
        if (!isWhitespace.test(precedingText)) {
            this.lines[firstLine] = precedingText;
            firstLine++;
        }
    }

    var lastLine = end.line - 1 - this.linesRemoved;
    if (this.lines[lastLine].length < end.column) {
        var followingText = this.lines[firstLine].substring(end.column);
        isWhitespace.index = 0;
        if (!isWhitespace.test(followingText)) {
            this.lines[lastLine] = followingText;
            lastLine--;
        }
    }

    var linesToRemove = lastLine - firstLine + 1;
    if (linesToRemove > 0) {
        this.lines.splice(firstLine, linesToRemove);
        this.linesRemoved += linesToRemove;
    }
};

File.prototype.visit = function(exp) {
    if (exp.leadingComments)
        this.handleComments(exp.leadingComments, exp.loc);

    if (Array.isArray(exp)) {
        for (var i = 0; i < exp.length; i++)
            this.visit(exp[i]);
        return;
    }

    switch (exp.type) {
        case 'ExpressionStatement':
            this.visit(exp.expression);
            break;
        case 'VariableDeclaration':
            this.visit(exp.declarations);
            break;
        case 'VariableDeclarator':
            this.visit(exp.id);
            this.visit(exp.init);
            break;
        // case 'FunctionExpression':
        //     break;
        case 'FunctionDeclaration':
            this.visit(exp.id);
            this.visit(exp.params);
            this.visit(exp.body);
            break;
        case 'ForStatement':
            this.visit(exp.init);
            this.visit(exp.test);
            this.visit(exp.update);
            this.visit(exp.body);
            break;
        case 'BlockStatement':
            this.visit(exp.body);
            break;
        case 'ReturnStatement':
            this.visit(exp.argument);
            break;
        case 'BinaryExpression':
            this.visit(exp.left);
            this.visit(exp.right);
            break;
        case 'CallExpression':
            this.visit(exp.arguments);
            this.visit(exp.callee);
            break;
        // case 'LogicalExpression':
        //     this.visit(exp.left);
        //     this.visit(exp.right);
        //     break;
        case 'MemberExpression':
            this.visit(exp.object);
            this.visit(exp.property);
            break;
        case 'UpdateExpression':
            this.visit(exp.argument);
            break;
        case 'Identifier':
        case 'Literal':
            break;
        default:
            throw new Error('Unrecognized Expression Type: ' + exp.type);
    }
};

module.exports = File;
