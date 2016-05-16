var map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "\\": "&#39;",
    "/": "&#x2F;"
};


function escape(arg) {
    return arg.replace(/[&<>"\'\\/]/g, function(entity) {
        return map[entity];
    });
};

module.exports = escape;
