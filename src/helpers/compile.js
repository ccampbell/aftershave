var templateToJavascript = require('./templateToJavascript');

function compile(string, options) {
    return new Function('args', templateToJavascript(string, options));
}

module.exports = compile;
