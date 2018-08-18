'use strict';
const esprima = require('esprima');
const hljs = require('highlight.js');
const doctrine = require('doctrine');

const isWhitespace = /^\s*$/;
const notWhitespace = /\S/;

function prepareCommentText(comment) {
    const split = comment.split('\n');
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

function visitDoctrineAst(exp) {
    switch (exp.type) {
        case 'NameExpression':
            return exp.name;
        default:
            throw new Error('unsupported AST expression');
    }
}

function visitDoctrineTag(tag) {
    const type = visitDoctrineAst(tag.type);
    return `<br>${tag.name}\t${type}\t${tag.description}`;
}

function prepareJsdocText(comment) {
    const exp = doctrine.parse(comment, {unwrap: true});

    let text = exp.description;
    for (const tag of exp.tags)
        text += visitDoctrineTag(tag);
    return text;
}

class File {
    constructor(text) {
        const expressions = esprima.parse(text, {
            loc: true,
            attachComment: true
        });

        this.linesRemoved = 0;
        this.codeLines = text.split(/\r?\n/);
        this.comments = [];

        this.visit(expressions.body);

        let i, code = '', line;
        for (i = 0; i < this.codeLines.length; i++) {
            line = this.codeLines[i];
            if (line !== null)
                code += `${line}\n`;
        }

        const html = hljs.highlight('javascript', code).value;
        const htmlLines = html.split('\n');

        let j = 0;
        for (i = 0; i < this.codeLines.length; i++) {
            line = this.codeLines[i];
            if (line !== null)
                this.codeLines[i] = htmlLines[j++];
        }
    }

    processComment(comment) {
        let commentStartLine = comment.loc.start.line - this.linesRemoved - 1;
        let commentEndLine = comment.loc.end.line - this.linesRemoved - 1;

        let comments = this.comments[commentStartLine];
        if (!comments)
            comments = this.comments[commentStartLine] = [];

        let value, type;
        switch (comment.value.charAt(0)) {
            case '*':
                value = prepareJsdocText(comment.value);
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
            type,
            value
        });

        //single line comment
        if (comment.loc.end.line === comment.loc.start.line) {
            let line = this.codeLines[commentStartLine];
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
            const precedingText = this.codeLines[commentStartLine].substring(0, comment.loc.start.column);
            isWhitespace.index = 0;
            if (!isWhitespace.test(precedingText)) {
                this.codeLines[commentStartLine] = precedingText;
                commentStartLine++;
            }
        }

        //if last comment line has code on it, remove only the comment
        if (this.codeLines[commentEndLine].length > comment.loc.end.column) {
            const followingText = this.codeLines[commentEndLine].substring(comment.loc.end.column);
            isWhitespace.index = 0;
            if (!isWhitespace.test(followingText)) {
                this.codeLines[commentEndLine] = followingText;
                commentEndLine--;
            }
        }

        //remove lines with comments from code
        const linesRemoved = commentEndLine - commentStartLine + 1;
        if (linesRemoved > 0) {
            this.codeLines.splice(commentStartLine, linesRemoved);
            this.linesRemoved += linesRemoved;
        }
    }

    _isOnOwnLine(comment) {
        if (comment.loc.start.column === 0)
            return true;

        notWhitespace.index = 0;
        const line = this.codeLines[comment.loc.start.line - this.linesRemoved - 1];
        return line.search(notWhitespace) === comment.loc.start.column;
    }

    visit(exp) {
        if (exp === null)
            return;

        let i, comment;
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

        for (const property of Object.keys(exp)) {
            const value = exp[property];
            if (value !== null && typeof value === 'object')
                this.visit(value);
        }
    }
}

module.exports = File;
