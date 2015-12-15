var esprima = require('esprima');
var constants = require('./constants');



function transform(code, options) {
    var data = esprima.parse(code, {range: true, tokens: true, tolerant: true});
    var tokens = data.tokens;

    var undefinedVars = [];
    var definedVars = {'args': 1};
    var insideVarDeclaration = false;
    var defining = false;
    var token;
    var prev;
    var next;

    for (var i = 0; i < tokens.length; i++) {
        token = tokens[i];
        prev = tokens[i - 1];
        next = tokens[i + 1];

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
            if (constants.NATIVE_OBJECTS.hasOwnProperty(token.value)) {
                continue;
            }

            if (constants.NATIVE_FUNCTIONS.hasOwnProperty(token.value)) {
                continue;
            }

            // not defined
            if (prev.value !== ',' && !definedVars.hasOwnProperty(token.value)) {
                var prepend = 'args';

                if (next && next.value === '(') {
                    prepend = 'this.helpers';

                    if (options.exports) {
                        prepend = null;
                    }
                }

                undefinedVars.push([prepend, token]);
            }
        }

        if (token.type === 'Punctuator' && token.value === ';') {
            insideVarDeclaration = false;
            defining = false;
        }

        if (token.type === 'Keyword' && token.value === 'in') {
            insideVarDeclaration = false;
            defining = false;
        }
    }

    // replace the tokens backwards
    undefinedVars.reverse();

    function _replaceToken(token_data, code) {
        var prepend = '';
        if (token_data[0] !== null) {
            prepend = token_data[0] + '.';
        }

        var token = token_data[1];
        var subString = code.substr(token.range[0]);
        return code.substr(0, token.range[0]) + subString.replace(token.value, prepend + token.value);
    }

    for (i = 0; i < undefinedVars.length; i++) {
        code = _replaceToken(undefinedVars[i], code);
    }

    return code;
}

module.exports = transform;
