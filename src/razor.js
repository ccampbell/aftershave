
Razor = (function() {
    function _indent(count) {
        count *= 4;
        return new Array(++count).join(' ');
    }

    function _templateToJavascript(string) {

        // replace regular variables
        string = string.replace(new RegExp(Razor.start + '=\\s*(.*?)\\s*' + Razor.end, 'g'), "_QUOTE_ + $1 + _QUOTE_").replace(/@/g, 'args.');

        var regex = new RegExp(Razor.start + '\\s*(.*?):?\\s*' + Razor.end, 'g'),
            bits = string.split(regex),
            length = bits.length,
            bit,
            start,
            line_ending,
            code = [],
            first_word,
            expression,
            indent = 0,
            i;

        for (i = 0; i < length; i++) {
            bit = bits[i].replace(/^\s+/, '').replace(/\s+$/, '');

            if (!bit) {
                continue;
            }

            if (i % 2) {
                first_word = bit.split(' ')[0];
                bit = bit.replace(first_word, '');
                line_ending = ';';

                if (first_word == 'elseif') {
                    first_word = 'else if';
                }

                switch (first_word) {
                    case 'case':
                        line_ending = ':';
                        break;
                    case 'else if':
                    case 'if':
                    case 'else':
                    case 'for':
                    case 'switch':
                        line_ending = ' {';
                        break;
                }

                if (first_word.indexOf('end') === 0) {
                    indent -= 1;
                    code.push(_indent(indent) + '}\n\n');
                    continue;
                }

                expression = line_ending == ';';

                if (expression && bit.charAt(bit.length - 1) == ';') {
                    line_ending = '';
                }

                code.push(_indent(indent) + first_word + bit.replace(/@/g, 'args.') + line_ending + '\n');

                if (!expression) {
                    indent += 1;
                }

                if (first_word == 'break') {
                    indent -= 1;
                }

                continue;
            }

            start = !start ? 'var t = ' : 't += ';
            code.push(_indent(indent) + start + '\'' + bit.replace(/\'/g, "\\'").replace(/\n/g, '').replace(/_QUOTE_/g, "'") + '\'' + ';\n');
        }

        code.push('return t;');
        return code.join('');
    }

    return {
        start: '\\<\\?',
        end: '\\?\\>',

        generate: function(string) {
            return _templateToJavascript(string);
        },

        compile: function(string) {
            return new Function(string);
        }
    };
}) ();

exports.generate = Razor.generate;