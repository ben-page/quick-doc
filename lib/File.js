'use strict';
var esprima = require('esprima');
var hljs = require('highlight.js');

function File(text) {
    var expressions = esprima.parse(text, {
        loc: true,
        attachComment: true
    });

    this.codeLines = text.replace('\r\n', '\n').split('\n');
    this.comments = new Array(this.codeLines.length).fill(null);

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

File.prototype._isOnOwnLine = function(comment) {
    var start = comment.loc.start;

    if (start.column === 0)
        return true;
};

function padArray(array, start, count) {
    var args = new Array(count + 2);
    args[0] = start;
    args[1] = 0; //deleteCount
    args.fill(null, 2);

    Array.prototype.splice.apply(array, args);
}

function spliceArray(array, start, deleteCount, itemsToAdd) {
    var args = itemsToAdd.slice(0);
    args.unshift(deleteCount);
    args.unshift(start);
    Array.prototype.splice.apply(array, args);
}

File.prototype.handleComments = function(comments, blockLoc) {
    //format comment lines
    var split, lines = [];
    for (var i = 0; i < comments.length; i++) {
        var line = comments[i].value;
        switch (line.charAt(0)) {
            case '*'://jsdoc
                split = line.split('\n');
                Array.prototype.push.apply(lines, split);
                break;
            case '!': //ignore
                break;
            default:
                split = line.split('\n');
                //while(split)
                Array.prototype.push.apply(lines, split);
                break;
        }
    }

    //if first comment line has code on it, remove only the comment
    var firstCommentStart = comments[0].loc.start;
    var firstCommentLine = firstCommentStart.line - 1;
    if (firstCommentStart.column !== 0) {
        var precedingText = this.codeLines[firstCommentLine].substring(0, firstCommentStart.column);
        isWhitespace.index = 0;
        if (!isWhitespace.test(precedingText)) {
            this.codeLines[firstCommentLine] = precedingText;
            firstCommentLine++;
        }
    }

    //if last comment line has code on it, remove only the comment
    var lastCommentEnd = comments[comments.length - 1].loc.end;
    var lastCommentLine = lastCommentEnd.line - 1;
    if (this.codeLines[lastCommentLine].length < lastCommentEnd.Column) {
        var followingText = this.codeLines[firstCommentLine].substring(lastCommentEnd.Column);
        isWhitespace.index = 0;
        if (!isWhitespace.test(followingText)) {
            this.codeLines[lastCommentLine] = followingText;
            lastCommentLine--;
        }
    }

    //remove lines with comments from code
    var linesRemoved = lastCommentLine - firstCommentLine + 1;

    var firstCodeLine = blockLoc.start.line - 1 ;
    var lastCodeLine = blockLoc.end.line - 1;
    var codeLineCount = lastCodeLine - firstCodeLine + 1;

    var diff = lines.length - codeLineCount;

    if (diff <= 0) {
        spliceArray(this.comments, firstCommentLine, lines.length + linesRemoved, lines);
        this.codeLines.splice(firstCommentLine, linesRemoved);
    } else {
        spliceArray(this.comments, firstCommentLine, lines.length + linesRemoved - diff, lines);
        this.codeLines.splice(firstCommentLine, linesRemoved);
        padArray(this.codeLines, lastCodeLine - linesRemoved + 1, diff);
    }
};

File.prototype.visit = function(exp) {
    if (exp === null)
        return;

    if (Array.isArray(exp)) {
        for (var i = exp.length - 1; i >= 0; i--)
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

    if (exp.leadingComments)
        this.handleComments(exp.leadingComments, exp.loc);
};

module.exports = File;
