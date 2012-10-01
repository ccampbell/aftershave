VERSION = '0.1';
fs = require('fs');
path = require('path');
razor = require('./razor.js');
output = '';

Motor = (function() {
    function _wrap(fn, name) {
        var code = 'Razor.Templates[\'' + name + '\'] = function(args) {\n';
        code += '    ' + fn.replace(/\n/g, '\n    ') + '\n};\n';
        return code;
    }

    function _startOutput() {
        var str = 'Razor = window.Razor || {};\n';
        str += 'Razor.Templates = {};\n';
        str += 'Razor.render = function(name, args) {\n';
        str += '    if (Razor.Templates[name]) {\n';
        str += '        return Razor.Templates[name].call(Razor, args || {});\n';
        str += '    }\n';
        str += '    return \'\';\n';
        str += '};\n\n';

        return str;
    }

    function _writeToDisk(dest) {
        fs.writeFileSync(dest, output.replace(/ +(?=\n)/g, ''), 'UTF-8');
        output = '';
    }

    return {
        processFile: function(src, dest, append) {
            if (!output) {
                output = _startOutput();
            }

            var contents = fs.readFileSync(src, 'UTF-8'),
                fn = razor.generate(contents),
                name = src.split('/').pop().split('.')[0];

            output += _wrap(fn, name);

            if (!append) {
                // finish
            }
        },

        processDirectory: function(src, dest) {
            fs.readdir(src, function(err, files) {
                files.forEach(function(file) {
                    var path = src + '/' + file;
                    if (fs.statSync(path).isDirectory()) {

                        // ignore subdirectories
                        return;
                    }

                    Motor.processFile(path, dest, true);
                });

                _writeToDisk(dest);
            });
        }
    };
}) ();

exports.start = function(args) {
    args = args.slice(2);

    if (args.length === 0) {
        console.log('need to specify file or directory');
        return;
    }

    if (!path.existsSync(args[0])) {
        console.log(args[0] + ' is not a file or directory');
        return;
    }

    if (fs.statSync(args[0]).isDirectory()) {
        if (!args[1]) {
            console.log('need to specify an output path for compiled templates');
            return;
        }

        Motor.processDirectory(args[0].replace(/\/+$/g, ''), args[1]);
        return;
    }

    if (args[0].split('.').pop() != 'rzml') {
        console.log('file extension should be .rzml');
        return;
    }

    Motor.processFile(args[0], args[1] || args[0].replace('.rzml', '.js'));
};
