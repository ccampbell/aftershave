/* jshint node:true */
var path = require('path');
var esprima = require('esprima');
var compiler;
var NATIVE_FUNCTIONS = {
    'decodeURI': 1,
    'decodeURIComponent': 1,
    'encodeURI': 1,
    'encodeURIComponent': 1,
    'isFinite': 1,
    'isNaN': 1,
    'parseInt': 1,
    'parseFloat': 1
};

var NATIVE_OBJECTS = {
    'Array': 1,
    'Boolean': 1,
    'Date': 1,
    'Error': 1,
    'Function': 1,
    'JSON': 1,
    'Math': 1,
    'Map': 1,
    'Number': 1,
    'Object': 1,
    'RegExp': 1,
    'String': 1,
    'WeakMap': 1
};

var Aftershave = (function() {
    'use strict';

    function _indent(count) {
        count *= 4;
        return new Array(++count).join(' ');
    }

    function _trim(string) {
        return _ltrim(string).replace(/\s+$/, '');
    }

    function _ltrim(string) {
        return string.replace(/^\s+/, '');
    }

    function _stripQuotes(string) {
        return string.replace(/['"]/g, '');
    }

    function _templateNameFromPath(view, useBasename) {
        if (useBasename === undefined) {
            useBasename = true;
        }

        view = _trim(view);

        // take just the end of the path
        if (useBasename) {
            view = path.basename(view);
        }

        var bits = view.split('.');

        // no extension included
        if (bits.length === 1) {
            return bits[0];
        }

        bits.pop();
        return bits.join('.');
    }

    function _transform(code) {
        var data = esprima.parse(code, {range: true, tokens: true, tolerant: true});
        var tokens = data.tokens;

        var undefinedVars = [];
        var definedVars = {};
        var insideVarDeclaration = false;
        var defining = false;
        var token;
        var prev;

        for (var i = 0; i < tokens.length; i++) {
            token = tokens[i];
            prev = tokens[i - 1];

            if (token.type === 'Keyword' && token.value === 'var') {
                insideVarDeclaration = true;
                defining = true;
                continue;
            }

            if (insideVarDeclaration && token.type === 'Punctuator' && token.value === ',') {
                defining = true;
                continue;
            }

            if (insideVarDeclaration && token.type === 'Punctuator' && token.value === '=') {
                defining = false;
                continue;
            }

            if (token.type === 'Identifier' && prev.value !== '.' && prev.value !== '{') {
                if (defining) {
                    definedVars[token.value] = 1;
                    continue;
                }

                // if this is a native javascript object then ignore
                if (NATIVE_OBJECTS.hasOwnProperty(token.value)) {
                    continue;
                }

                if (NATIVE_FUNCTIONS.hasOwnProperty(token.value)) {
                    continue;
                }

                // not defined
                if (prev.value !== ',' && !definedVars.hasOwnProperty(token.value)) {
                    undefinedVars.push(token);
                }
            }

            if (token.type === 'Punctuator' && token.value === ';') {
                insideVarDeclaration = false;
                defining = false;
            }
        }

        // replace the tokens backwards
        undefinedVars.reverse();

        function _replaceToken(token, code) {
            var subString = code.substr(token.range[0]);
            return code.substr(0, token.range[0]) + subString.replace(token.value, 'args.' + token.value);
        }

        for (i = 0; i < undefinedVars.length; i++) {
            code = _replaceToken(undefinedVars[i], code);
        }

        return code;
    }

    function _templateToJavascript(string) {

        string = string.replace(/\s{2,}/g, ' ').replace(/> </g, '><');

        // replace inline variables
        string = string.replace(new RegExp('{{\\s*(.*?);?\\s*}}', 'g'), function(group, code) {
            code = "' + " + code + " + '";
            return code.replace(/\'/g, '_QUOTE_');
        });

        // strip out html comments
        string = string.replace(/<!--(.*?)-->/g, '');

        var regex = new RegExp('{%\\s*(.*?)[:;]?\\s*%}', 'g'),
            functionRegex = /^\s*?([a-zA-Z0-9_]+)?\s*\((.*)\)/,
            bits = string.split(regex),
            length = bits.length,
            matches,
            bit,
            line,
            start,
            definedVars = {},
            defaultVar = '_t',
            activeVar = defaultVar,
            lineEnding,
            code = [],
            firstWord,
            expression,
            extend,
            block,
            indent = 0,
            i;

        for (i = 0; i < length; i++) {
            line = bits[i];

            // if it is all spaces then remove them
            if (line.replace(/ /g, '') === '') {
                line = '';
            }

            if (!line) {
                continue;
            }

            if (i % 2) {
                firstWord = line.split(' ')[0];
                bit = line.replace(firstWord, '');
                lineEnding = ';';

                if (firstWord === 'elseif') {
                    firstWord = 'else if';
                }

                switch (firstWord) {
                    case 'case':
                    case 'default':
                        lineEnding = ':';
                        break;
                    case 'if':
                    case 'for':
                    case 'switch':
                        lineEnding = ' {';
                        break;
                    case 'else if':
                    case 'else':
                        indent -= 1;
                        firstWord = '} ' + firstWord;
                        lineEnding = ' {';
                        break;
                }

                // if the first line is an if statement or loop we need to make
                // sure that t is defined for later
                if (!start) {
                    start = 'var ' + activeVar + ' = \'\';\n\n';
                    definedVars[activeVar] = 1;
                    code.push(start);
                }

                if (firstWord.indexOf('end') === 0) {
                    if (block && --block === 0) {

                        // if this is not an extended block
                        // then allow the default block value to come through
                        if (!extend) {
                            code.push(_indent(indent) + defaultVar + ' += ' + activeVar.replace(/Block$/, '') + ' || ' + activeVar + ';\n');
                        }

                        activeVar = defaultVar;
                        continue;
                    }

                    indent -= 1;
                    code.push(_indent(Math.max(indent, 0)) + '}\n\n');
                    continue;
                }

                expression = lineEnding === ';';

                // if there is an expression that ends on the same line
                if (lineEnding === ' {' && bit.charAt(bit.length - 1) === '}') {
                    expression = true;
                    lineEnding = '';
                }

                if (expression && bit.charAt(bit.length - 1) === ';') {
                    lineEnding = '';
                }

                if (firstWord === 'block') {
                    block = 1;
                    activeVar = _trim(_stripQuotes(bit)) + 'Block';
                    continue;
                }

                // special case for extending views
                if (firstWord === 'extend' || firstWord === 'extends') {
                    var useBasename = false;
                    extend = _templateNameFromPath(_stripQuotes(bit), useBasename);
                    continue;
                }

                // render helper functions
                if (expression && functionRegex.test(line)) {
                    matches = functionRegex.exec(line);
                    var functionName = matches[1];
                    var functionArgs = matches[2].split(',');

                    if (functionName != 'if' && functionName != 'for' && functionName != 'switch') {

                        if (!NATIVE_FUNCTIONS.hasOwnProperty(functionName)) {
                            functionName = 'this.helpers.' + functionName;

                            // special for render and escape
                            if (matches[1] === 'render') {
                                functionArgs[0] = '\'' + _templateNameFromPath(functionArgs[0].replace(/['"]/g, '')) + '\'';
                                functionName = 'this.render';
                            }

                            if (matches[1] === 'escape') {
                                functionName = 'this.escape';
                            }
                        }

                        code.push(_indent(indent) + activeVar + ' += (' + functionName + '(' + functionArgs.join(',') + ') || \'\')' +lineEnding + '\n');
                        continue;
                    }
                }

                // only increase block level with if for and switch statements
                // when an else statement happens it shouldn't increase again
                // because there is still only one {% end %} statement that is
                // expected
                if (block && ['if', 'for', 'switch'].indexOf(firstWord) === 0) {
                    block += 1;
                }

                code.push(_indent(indent) + firstWord + bit + lineEnding + '\n');

                if (!expression) {
                    indent += 1;
                }

                if (firstWord === 'break') {
                    indent -= 1;
                }

                continue;
            }

            start = activeVar + ' += ';
            if (!definedVars[activeVar]) {
                start = 'var ' + activeVar + ' = ';
                definedVars[activeVar] = 1;
            }

            code.push(_indent(indent) + start + '\'' + line.replace(/\'/g, "\\'").replace(/\n/g, '').replace(/_QUOTE_/g, "'") + '\'' + ';\n');
        }

        if (extend) {
            var extendData = [];
            for (var key in definedVars) {
                if (key != defaultVar) {
                    extendData.push(key.replace(/Block$/, '') + ': ' + key);
                }
            }

            var renderCall = 'this.render(\'' + extend + '\', {' + extendData.join(', ') + '});\n';

            // if no variables were set to extend then return this directly
            if (extendData.length === 0) {
                return 'return ' + _transform(renderCall);
            }

            code.push(defaultVar + ' += ' + renderCall);
        }

        code.push('return ' + defaultVar + ';');
        return _transform(code.join(''));
    }

    return {
        generate: function(string) {
            return _templateToJavascript(string);
        },

        compile: function(string) {
            return new Function('args', _templateToJavascript(string));
        },

        render: function(string, args, context) {
            return this.compile(string).call(context || Aftershave, args);
        },

        templateNameFromPath: function(path) {
            return _templateNameFromPath(path);
        },

        process: function() {
            if (!compiler) {
                compiler = require('./compiler.js');
            }
            var instance = new compiler.Compiler();
            instance.process.apply(instance, arguments);
        }
    };
}) ();

module.exports = Aftershave;
