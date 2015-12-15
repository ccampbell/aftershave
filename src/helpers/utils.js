function _ltrim(string) {
    return string.replace(/^\s+/, '');
}

function trim(string) {
    return _ltrim(string).replace(/\s+$/, '');
}

function stripQuotes(string) {
    return string.replace(/['"]/g, '');
}

function indent(count) {
    count *= 4;
    return new Array(++count).join(' ');
}

module.exports = {
    trim: trim,
    indent: indent,
    stripQuotes: stripQuotes
};
