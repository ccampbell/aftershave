# Aftershave

To make you feel good after shaving off your mustache.

## Installation

To install run

```
npm install -g aftershave
```

After that

```
aftershave --help
```

## About

Aftershave is a slightly different approach to javascript templating.  Rather than parse and compile on the fly as your code executes, it precompiles templates into a vanilla javascript module you can include.

Most templating systems have limits to what kind of expressions you can do.  Aftershave lets you execute any javascript code.

For example, this template:

```html
<ul>
    {% for (var i = 0, i < fruits.length; i++) %}
        <li>{{ fruits[i] }}</li>
    {% end %}
</ul>
```

Compiles into this:

```javascript
Aftershave.templates.fruits = function(args) {
    var _t = '<ul> ';
    for (var i = 0; i < args.fruits.length; i++) {
        _t += ' <li>' + args.fruits[i] + '</li> ';
    }
    _t += '</ul>';
    return _t;
};
```

Then to execute this, you would include the generated template file and call

```javascript
Aftershave.render('fruits', {
    fruits: ['apple', 'blueberry', 'orange']
});
```

This is extremely fast since all it is doing is string concatenation.

Check out the tests to see some examples.

## Usage

```
aftershave /path/to/file1.html /path/to/directory --output /path/to/templates.js
```

This will compile all the templates in the specified locations to `/path/to/templates.js`.  That module will expose an aftershave module to node.js or the browser to use to render your templates.

You can use it from node.js also

```javascript
var aftershave = require('aftershave');

// only call this once to compile templates
aftershave.process(['/path/to/file1.html', '/path/to/directory'], '/path/to/templates.js');

var templates = require('/path/to/templates.js');
var output = templates.render('some-name', {cool: true});
```
