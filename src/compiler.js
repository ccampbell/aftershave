/* jshint node: true */
/* global console */
var uglify = require('uglify-js');
var fs = require('fs'),
    path = require('path'),
    VERSION = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'))).version,
    aftershave = require('./aftershave.js');

function Compiler() {
    'use strict';
    var self = this;

    var startOutput = '';
    var output = '';
    var templateNames = {};

    function _getStart(name) {
        if (name.indexOf(path.sep) !== -1) {
            return name.replace(new RegExp(path.sep, 'g'), /*'ᐳㅣᐅ', */'ㅣ');
        }

        if (name.indexOf('-') !== -1 || name.indexOf('.') !== -1) {
            return name.replace(/(?:-|\.)(.)/g, function(_, group1) {
                return group1.toUpperCase();
            });
        }

        return name;
    }

    function _wrap(fn, name, first) {
        templateNames[name] = _getStart(name);
        var code = (first ? '' : '\n') + 'export function ' + templateNames[name] + '(args) {\n';
        code += '    ' + fn.replace(/\n/g, '\n    ') + '\n}\n';
        return code;
    }

    function _startOutput() {
        var str = '// generated by Aftershave ' + VERSION + '\n';
        str += 'const _a = {};\n\n';
        str += 'export function empty() {\n';
        str += '    return \'\';\n';
        str += '}\n';
        return str;
    }

    function _endOutput() {
        return 'export { _a as Aftershave };';
    }

    function _getEscape() {
        var str = "\nconst map = {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;','\\'':'&#39;','/':'&#x2F;'};\n";
        str += 'export function escape(arg) {\n';
        str += '    return arg.replace(/[&<>"\'\\/]/g, function(entity) {\n';
        str += '        return map[entity];\n';
        str += '    });\n';
        str += '}\n\n';
        return str;
    }

    function _getHelpers() {
        var str = '_a.helpers = {};\n';
        return str;
    }

    function _rewriteFunctions(content) {
        content = content.replace(/this\.helpers\./g, '_a.helpers.');
        content = content.replace(/this\.render\(('|")(.*?)(?:\1),?\s*(.*)/g, function(match, _, g2, g3) {
            if (!templateNames[g2]) {
                console.warn('There is no template defined with the name: ' + g2);
                templateNames[g2] = 'empty';
            }
            return templateNames[g2] + '(' + g3;
        });
        return content;
    }

    self.processFile = function(src, matchRegex, isSubDirectory) {
        if (matchRegex && !new RegExp(matchRegex).test(src)) {
            console.warn('warning:', 'file ' + src + ' does not match pattern: "' + matchRegex + '", skipping...');
            return;
        }

        var first = false;

        if (!startOutput) {
            startOutput = _startOutput();
            first = true;
        }

        var contents = fs.readFileSync(src, 'UTF-8'),
            fn = aftershave.generate(contents),
            name = aftershave.templateNameFromPath(src);

        if (isSubDirectory) {
            name = path.join(isSubDirectory, name);
        }

        output += _wrap(fn, name, first);
    };

    self.processDirectory = function(src, matchRegex, isSubDirectory) {
        fs.readdirSync(src).forEach(function(file) {
            var filePath = path.join(src, file);

            if (fs.statSync(filePath).isDirectory()) {

                // don't go two levels deep
                if (isSubDirectory) {
                    return;
                }

                self.processDirectory(filePath, matchRegex, filePath.replace(src + path.sep, ''));
                return;
            }

            self.processFile(filePath, matchRegex, isSubDirectory);
        });
    };

    self.writeToDisk = function(dest) {
        if (!self.alone && output.indexOf('escape(') !== -1) {
            startOutput += _getEscape();
        }

        if (!self.alone && output.indexOf('this.helpers.') !== -1) {
            startOutput += _getHelpers();
        }

        var contents = startOutput + '\n' + output + '\n' + _endOutput();
        contents = contents.replace(/ +(?=\n)/g, '');

        contents = _rewriteFunctions(contents);

        if (self.ugly) {
            contents = uglify.minify(contents, {fromString: true}).code;
        }

        fs.writeFileSync(dest, contents, 'UTF-8');
        startOutput = '';
        output = '';
    };

     self.process = function(filesToProcess, outputFile, minimize, matchRegex) {
        if (typeof filesToProcess === 'string') {
            filesToProcess = [filesToProcess];
        }

        if (!outputFile && filesToProcess.length === 1) {
            outputFile = filesToProcess[0].replace(/\.([a-zA-Z]+)$/, '') + '.js';
        }

        if (minimize) {
            self.ugly = true;
        }

        filesToProcess.forEach(function(path) {
            if (fs.statSync(path).isDirectory()) {
                self.processDirectory(path, matchRegex);
                return;
            }
            self.processFile(path, matchRegex);
        });

        self.writeToDisk(outputFile);
    };

    self.showUsage = function(message) {
        if (message) {
            console.error('error:', message, '\n');
        }

        // Ivrit font
        console.log('        __ _                _                     ');
        console.log('  __ _ / _| |_ ___ _ __ ___| |__   __ ___   _____ ');
        console.log(' / _` | |_| __/ _ \\ \'__/ __| \'_ \\ / _` \\ \\ / / _ \\');
        console.log('| (_| |  _| ||  __/ |  \\__ \\ | | | (_| |\\ V /  __/');
        console.log(' \\__,_|_|  \\__\\___|_|  |___/_| |_|\\__,_| \\_/ \\___|');
        console.log('v' + VERSION);
        console.log('');
        console.log('Usage:');
        console.log('aftershave file1.html file2.html directory1 --output templates.js');
        console.log('aftershave templates --matches "(.*).html"');
        console.log('');
        console.log('Arguments:');
        console.log('--help                 show help');
        console.log('--output               js file to output compiled templates to');
        console.log('--matches              specify regex pattern to match filenames against');
        console.log('--forever-alone        compile templates on their own without helper functions');
        console.log('--ugly                 run the resulting code through uglify to minimize it');
    };

    return self;
}

/**
 * this is just fancy stuff to make the command line interface friendly
 */
exports.Compiler = Compiler;
exports.start = function(args) {
    var compiler = new Compiler();

    args = args.slice(2);

    if (args.length === 0) {
        compiler.showUsage('need to specify file or directory');
        return;
    }

    if (args.indexOf('--help') !== -1) {
        compiler.showUsage();
        return;
    }

    var outputIndex = args.indexOf('--output'),
        matchIndex = args.indexOf('--matches'),
        aloneIndex = args.indexOf('--forever-alone'),
        uglyIndex = args.indexOf('--ugly'),
        matchRegex,
        outputFile,
        filesToProcess = [],
        argsToSkip = [];

    if (outputIndex !== -1) {
        outputFile = args[outputIndex + 1];
        argsToSkip.push(outputIndex, outputIndex + 1);
    }

    if (matchIndex !== -1) {
        matchRegex = args[matchIndex + 1];
        argsToSkip.push(matchIndex, matchIndex + 1);
    }

    if (aloneIndex !== -1) {
        compiler.alone = true;
        argsToSkip.push(aloneIndex);
    }

    if (uglyIndex !== -1) {
        compiler.ugly = true;
        argsToSkip.push(uglyIndex);
    }

    if (!outputFile && (args.length - argsToSkip.length) > 1) {
        compiler.showUsage('no output file specified!');
        return;
    }

    args.forEach(function(arg, i) {
        if (argsToSkip.indexOf(i) !== -1) {
            return;
        }

        if (!fs.existsSync(arg)) {
            console.warn('warning: ' + arg + ' is not a file or directory');
            return;
        }

        filesToProcess.push(arg);
    });

    if (filesToProcess.length === 0) {
        compiler.showUsage('no files to process!');
        return;
    }

    compiler.process(filesToProcess, outputFile, null, matchRegex);
};
