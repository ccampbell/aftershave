var Aftershave = require('../Aftershave');
var compile = require('./compile');

function render(string, args, context, options) {
    return compile(string, options).call(context || Aftershave, args);
}

module.exports = render;
