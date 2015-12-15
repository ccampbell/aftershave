var utils = require('./utils');
var path = require('path');

function templateNameFromPath(view, useBasename) {
    if (useBasename === undefined) {
        useBasename = true;
    }

    view = utils.trim(view);

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

module.exports = templateNameFromPath;
