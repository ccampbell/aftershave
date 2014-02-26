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

This makes it way faster than other template engines since all it is doing is string concatenation.  It also provides a simple, clean syntax and allows any regular javascript code.  Most other templating systems require you to learn a special syntax.

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

## Usage

```
aftershave /path/to/file1.html /path/to/directory --output /path/to/templates.js
```

This will compile all the templates in the specified locations to `/path/to/templates.js`.  That module will expose an aftershave module to node.js or the browser to use to render your templates.

You can do the same thing from node.js also

```javascript
var aftershave = require('aftershave');

// WARNING: this should not be called multiple times
// only call this once to generate the compiled templates then use `require` and
// render them that way
aftershave.process(['/path/to/file1.html', '/path/to/directory'], '/path/to/templates.js');

var templates = require('/path/to/templates.js');
var output = templates.render('some-name', {cool: true});
```

## Documentation

Aftershave templates are pretty heavily inspired by [tornado templates](http://www.tornadoweb.org/en/stable/template.html).  The syntax is very similar.

#### Variables

Wrapping a variable in `{{ foo }}` will render it inline directly in the template.

#### Code blocks

Anything else should be placed inside `{%` and `%}` tags.  You can use any javascript code.  Any code that surrounds a block should be followed by a `{% end %}` tag.  For example:

```html
<p>
    {% if (word.length > 25) %}
        Wow that is a long word
    {% else %}
        That is a normal sized word
    {% end %}
</p>
```

#### Helpers

There are a few built in helper functions

##### Escape

By default aftershave does not escape variables.

To escape a variable just wrap it in a function call:

```html
<p>The email you entered is: {% escape(email) %}</p>
```

##### Render

If you call the render function it will render a sub template at this point.  This is convenient if you have modules that you want to include on multiple pages and don't want to duplicate the code.

```html
{% render('partial/user_grid.html', {users: users}) %}
```

When templates are compiled the file extension is stripped out of the template name so it is optional to include it here.  Aftershave should process a single level of sub-directories to allow you to better organize your templates.

##### Other helpers

Any other function call you include will be mapped to a helpers object in the generated code.  You can then pass it in.  For example if you wanted to add a helper function to translate text into another language you could do something like this:

In **template.html**

```html
<h1>{% translate('Hello!') %}</h1>
```

In **something.js** after including the generated template code

```javascript
Aftershave.helpers.translate = function(text) {
    // determine language
    var language = getUserLanguage();
    if (text == 'Hello!' && language == 'spanish') {
        return '¡Hola!';
    }
};
```

#### Extending other templates

Aftershave let's you extend any other templates.  This let's you do things like have default sections in one place that are overridden by subtemplates.  For example you might want to use different layouts for a complex site.

**master.phtml**

```html
<!DOCTYPE html>
<head>
    <title>{% block title %}Default Title{% end %}</title>
</head>
<body>
    {{ content }}
    {% renderJavascript() %}
</body>
```

**home.phtml**

```html
{% extends master.phtml %}
{% addJavascript('/static/js/home.js') %}
{% block title %}This is the homepage{% end %}
{% block content %}
    <p>The content goes here.</p>
{% end %}
```

Next you need to define the javascript helpers somewhere in your code:

```javascript
function ViewHelpers() {
    var self = this;
    self.jsFiles = [];

    return {
        addJavascript: function(path) {
            self.jsFiles.push(path);
        },

        renderJavascript: function() {
            var finalJs = '';
            for (var i = 0; i < self.jsFiles.length; i++) {
                finalJs += '<script src="' + self.jsFiles[i] + '"></script>';
            }
            return finalJs;
        }
    }
};

// call this with each request
aftershave.helpers = new ViewHelpers();
```

Now if you run `Aftershave.render('home')` the final rendered template will look like this:

```html
<!DOCTYPE html>
<head>
    <title>This is the homepage</title>
</head>
<body>
    <p>The content goes here.</p>
    <script src="/static/js/home.js"></script>
</body>
```

Any variables are replaced in the parent template.  The `{% block %}` tags let you specify a default value for a certain section.  If the subtemplate did not pass in a title then the title would fall back to the default title `Default Title`.

If you do not wrap a section in a `{% block %}` tag in the parent template and then do not pass that variable into the child template it will render as `'undefined'`.
