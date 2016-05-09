'use strict';
var esprima = require('esprima');
var hljs = require('highlight.js');
var doctrine = require("doctrine");

function File(text) {
    var expressions = esprima.parse(text, {
        loc: true,
        attachComment: true
    });

    this.linesRemoved = 0;
    this.codeLines = text.split(/\r?\n/);
    this.comments = [];

    this.visit(expressions.body);

    var i, code = '', line;
    for (i = 0; i < this.codeLines.length; i++) {
        line = this.codeLines[i];
        if (line !== null)
            code += line + '\n';
    }

    var html = hljs.highlight('javascript', code).value;
    var htmlLines = html.split('\n');

    var j = 0;
    for (i = 0; i < this.codeLines.length; i++) {
        line = this.codeLines[i];
        if (line !== null)
            this.codeLines[i] = htmlLines[j++];
    }
}

var isWhitespace = /^\s*$/;

function prepareCommentText(comment) {
    var split = comment.split('\n');
    if (split.length === 1)
        return split[0].trim();

    isWhitespace.index = 0;
    if (isWhitespace.test(split[0]))
        split.splice(0, 1);

    if (split.length === 1)
        return split[0].trim();

    if (isWhitespace.test(split[split.length - 1]))
        split.splice(split.length - 1, 1);

    if (split.length === 1)
        return split[0].trim();

    return split.join('<br>');
}

File.prototype.processComment = function(comment) {
    var commentStartLine = comment.loc.start.line - this.linesRemoved - 1;
    var commentEndLine = comment.loc.end.line - this.linesRemoved - 1;

    var comments = this.comments[commentStartLine];
    if (!comments)
        comments = this.comments[commentStartLine] = [];

    var value, type;
    switch (comment.value.charAt(0)) {
        case '*':
            value = doctrine.parse(comment.value, { unwrap: true });
            type = 'jsdoc';
            break;
        case '!':
            value = prepareCommentText(comment.value);
            type = 'ignore';
            break;
        case '$':
            value = prepareCommentText(comment.value);
            type = 'markdown';
            break;
        default:
            value = prepareCommentText(comment.value);
            type = 'regular';
            break;
    }

    comments.push({
        type: type,
        value: value
    });

    //single line comment
    if (comment.loc.end.line === comment.loc.start.line) {
        var line = this.codeLines[commentStartLine];
        if (comment.loc.start.column > 0 || line.length > comment.loc.end.column) {
            line = line.substring(0, comment.loc.start.column) + line.substring(comment.loc.end.column);

            isWhitespace.index = 0;
            if (!isWhitespace.test(line)) {
                this.codeLines[commentStartLine] = line;
                return;
            }
        }
        this.codeLines.splice(commentStartLine, 1);
        this.linesRemoved++;
        return;
    }

    //multiple line comment
    //if first comment line has code on it, remove only the comment
    if (comment.loc.start.column !== 0) {
        var precedingText = this.codeLines[commentStartLine].substring(0, comment.loc.start.column);
        isWhitespace.index = 0;
        if (!isWhitespace.test(precedingText)) {
            this.codeLines[commentStartLine] = precedingText;
            commentStartLine++;
        }
    }

    //if last comment line has code on it, remove only the comment
    if (this.codeLines[commentEndLine].length > comment.loc.end.column) {
        var followingText = this.codeLines[commentEndLine].substring(comment.loc.end.column);
        isWhitespace.index = 0;
        if (!isWhitespace.test(followingText)) {
            this.codeLines[commentEndLine] = followingText;
            commentEndLine--;
        }
    }

    //remove lines with comments from code
    var linesRemoved = commentEndLine - commentStartLine + 1;
    if (linesRemoved > 0) {
        this.codeLines.splice(commentStartLine, linesRemoved);
        this.linesRemoved += linesRemoved;
    }
};

var notWhitespace = /\S/;

File.prototype._isOnOwnLine = function(comment) {
    if (comment.loc.start.column === 0)
        return true;

    notWhitespace.index = 0;
    var line = this.codeLines[comment.loc.start.line - this.linesRemoved - 1];
    return line.search(notWhitespace) === comment.loc.start.column;
};

File.prototype.visit = function(exp) {
    if (exp === null)
        return;

    var i, comment;
    if (exp.leadingComments) {
        for (i = 0; i < exp.leadingComments.length; i++) {
            comment = exp.leadingComments[i];

            if (this._isOnOwnLine(comment))
                this.processComment(comment);
        }
    }

    if (exp.trailingComments) {
        for (i = 0; i < exp.trailingComments.length; i++) {
            comment = exp.trailingComments[i];

            if (!this._isOnOwnLine(comment))
                this.processComment(comment);
        }
    }

    if (Array.isArray(exp)) {
        for (i = 0; i < exp.length; i++)
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
        case 'FunctionExpression':
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
        case 'LogicalExpression':
        case 'AssignmentExpression':
        case 'BinaryExpression':
            this.visit(exp.left);
            this.visit(exp.right);
            break;
        case 'NewExpression':
        case 'CallExpression':
            this.visit(exp.callee);
            this.visit(exp.arguments);
            break;
        case 'MemberExpression':
            this.visit(exp.object);
            this.visit(exp.property);
            break;
        case 'UnaryExpression':
        case 'ThrowStatement':
        case 'UpdateExpression':
            this.visit(exp.argument);
            break;
        case 'ObjectExpression':
            this.visit(exp.properties);
            break;
        case 'Property':
            this.visit(exp.key);
            this.visit(exp.value);
            break;
        case 'IfStatement':
            this.visit(exp.test);
            this.visit(exp.consequent);
            break;
        case 'ForInStatement':
            this.visit(exp.left);
            this.visit(exp.right);
            this.visit(exp.body);
            break;
        case 'ArrayExpression':
            this.visit(exp.elements);
            break;
        case 'SwitchStatement':
            this.visit(exp.discriminant);
            this.visit(exp.cases);
            break;
        case 'SwitchCase':
            this.visit(exp.consequent);
            this.visit(exp.test);
            break;
        case 'ConditionalExpression':
            this.visit(exp.test);
            this.visit(exp.consequent);
            this.visit(exp.alternate);
            break;
        case 'WhileStatement':
            this.visit(exp.test);
            this.visit(exp.body);
            break;
        case 'ContinueStatement':
        case 'BreakStatement':
        case 'ThisExpression':
        case 'Identifier':
        case 'Literal':
            break;
        default:
            throw new Error('Unrecognized Expression Type: ' + exp.type);
    }
};

module.exports = File;
