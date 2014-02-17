/* jshint node:true */
var compiler = require('./compiler.js');
var path = require('path');

var Razor = (function() {
    'use strict';

    function _indent(count) {
        count *= 4;
        return new Array(++count).join(' ');
    }

    function _trim(string) {
        return string.replace(/^\s+/, '').replace(/\s+$/, '');
    }

    function _stripQuotes(string) {
        return string.replace(/['"]/g, '');
    }

    function _escape(string) {
        return string.replace(/\$\$([\w\-]+)/g, "this.escape($$$1)");
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

    function _replaceArgs(string) {
        return string.replace(/\$([\w\-]+)/g, function(match, arg) {
            if (arg.indexOf('-') === -1) {
                return 'args.' + arg;
            }

            return 'args[\'' + arg + '\']';
        });
    }

    function _templateToJavascript(string) {

        string = string.replace(/\s{2,}/g, ' ').replace(/> </g, '><');

        // replace inline variables
        string = string.replace(new RegExp('{{\\s*(.*?);?\\s*}}', 'g'), function(group, code) {
            code = _replaceArgs(_escape(code));
            code = "' + " + code + " + '";
            return code.replace(/\'/g, '_QUOTE_');
        });

        var regex = new RegExp('{%\\s*(.*?):?\\s*%}', 'g'),
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
            line = _trim(bits[i]);

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

                // special case for rendering sub views
                if (firstWord === 'render' || firstWord.indexOf('render(') === 0) {
                    matches = /render\s*\(\s*(['"])(.*?)\1(,(.*?)$)?/.exec(line);
                    var templateName = _templateNameFromPath(matches[2]);
                    code.push(_indent(indent) + activeVar + ' += this.' + _replaceArgs(line.replace(matches[2], templateName)) + lineEnding + '\n');
                    continue;
                }

                if (block) {
                    block += 1;
                }

                code.push(_indent(indent) + firstWord + _replaceArgs(_escape(bit)) + lineEnding + '\n');

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
        return code.join('');
    }

    return {
        generate: function(string) {
            return _templateToJavascript(string);
        },

        compile: function(string) {
            return new Function(string);
        },

        templateNameFromPath: function(path) {
            return _templateNameFromPath(path);
        },

        process: compiler.process
    };
}) ();

module.exports = Razor;
