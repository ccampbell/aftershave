/* jshint node:true */
var path = require('path');
var esprima = require('esprima');
var compiler;

var Razor = (function() {
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

    function _templateNameFromPath(view) {
        view = _trim(view);

        // take just the end of the path
        view = path.basename(view);

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

        var regex = new RegExp('{%\\s*(.*?):?\\s*%}', 'g'),
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
            line = _ltrim(bits[i]);

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
                        activeVar = defaultVar;
                        continue;
                    }

                    indent -= 1;
                    code.push(_indent(Math.max(indent, 0)) + '}\n\n');
                    continue;
                }

                expression = lineEnding === ';';

                if (expression && bit.charAt(bit.length - 1) === ';') {
                    lineEnding = '';
                }

                if (firstWord === 'block') {
                    block = 1;
                    activeVar = _trim(_stripQuotes(bit).replace('$', ''));
                    continue;
                }

                // special case for extending views
                if (firstWord === 'extend' || firstWord === 'extends') {
                    extend = _templateNameFromPath(_stripQuotes(bit));
                    continue;
                }

                // render helper functions
                if (expression && functionRegex.test(line)) {
                    matches = functionRegex.exec(line);
                    var functionName = matches[1];
                    var functionArgs = matches[2].split(',');

                    // special for render
                    functionName = 'this.helpers.' + functionName;
                    if (matches[1] === 'render') {
                        functionArgs[0] = '\'' + _templateNameFromPath(functionArgs[0].replace(/['"]/, '')) + '\'';
                        functionName = 'this.render';
                    }

                    if (matches[1] === 'escape') {
                        functionName = 'this.escape';
                    }

                    code.push(_indent(indent) + activeVar + ' += ' + functionName + '(' + functionArgs.join(',') + ')' +lineEnding + '\n');
                    continue;
                }

                if (block) {
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
                    extendData.push(key + ': ' + key);
                }
            }

            var renderCall = 'this.render(\'' + extend + '\', {' + extendData.join(', ') + '});\n';

            // if no variables were set to extend then return this directly
            if (extendData.length === 0) {
                return renderCall;
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

        render: function(string, args) {
            return this.compile(string).call(this, args);
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

module.exports = Razor;
