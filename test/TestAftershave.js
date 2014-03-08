/* global describe, it */
(function() {
    'use strict';

    var expect = require('chai').expect;
    var aftershave = require('../src/aftershave.js');

    function _run(template, args, expected, context) {
        var actual = aftershave.render(template, args, context);
        expect(actual).to.equal(expected);
    }

    describe('Testing Aftershave.render', function() {
        it('should work alone', function() {
            _run('<h1>Hello</h1>', {}, '<h1>Hello</h1>');
        });

        it('should work with variables', function() {
            _run('<h1>Hello {{ name }}!</h1>', {name: 'Craig'}, '<h1>Hello Craig!</h1>');
        });

        it('should work with variables with no spaces', function() {
            _run('<h1>Hello {{name}}!</h1>', {name: 'Craig'}, '<h1>Hello Craig!</h1>');
        });

        it('should work with if statements', function() {
            _run('<h1>Hello {% if (name) %}{{ name }}{% else %}Person{% end %}!</h1>', {}, '<h1>Hello Person!</h1>');
            _run('<h1>Hello {% if (name) %}{{ name }}{% else %}Person{% end %}!</h1>', {name: 'Craig'}, '<h1>Hello Craig!</h1>');

            // try endif
            _run('<h1>Hello {% if (name) %}{{ name }}{% else %}Person{% endif %}!</h1>', {}, '<h1>Hello Person!</h1>');

            // try punctuation
            _run('<h1>Hello {% if (name): %}{{ name }}{% else: %}Person{% endif; %}!</h1>', {}, '<h1>Hello Person!</h1>');
        });

        it('should work with if/elseif/else statements', function() {
            _run('{% if (test == 5) %}Hi{% elseif (test + 1 == 5) %}Hii{% else %}Hiii{% end %}', {}, 'Hiii');
            _run('{% if (test == 5) %}Hi{% else if (test + 1 == 5) %}Hii{% else %}Hiii{% end %}', {test: 4}, 'Hii');
            _run('{% if (test == 5) %}Hi{% else if (test + 1 == 5) %}Hii{% else %}Hiii{% end %}', {test: 5}, 'Hi');
        });

        it('should work with for loops', function() {
            var template = '<ul>{% for (var i = 0; i < fruits.length; i++) %}<li>{{ fruits[i] }}</li>{% end %}</ul>';
            var args = {fruits: ['Blueberry', 'Banana', 'Strawberry', 'Pumpkin']};
            var result = '<ul><li>Blueberry</li><li>Banana</li><li>Strawberry</li><li>Pumpkin</li></ul>';
            _run(template, args, result);

            // try endfor
            template = '<ul>{% for (var i = 0; i < fruits.length; i++) %}<li>{{ fruits[i] }}</li>{% endfor %}</ul>';
            _run(template, args, result);
        });

        it('should allow you to run any javascript', function() {

            // alphabetize the fruits in the view!
            var template = '{% fruits.sort() %}<ul>{% for (var i = 0; i < fruits.length; i++) %}<li>{{ fruits[i] }}</li>{% end %}</ul>';
            var args = {fruits: ['Blueberry', 'Banana', 'Strawberry', 'Pumpkin']};
            var result = '<ul><li>Banana</li><li>Blueberry</li><li>Pumpkin</li><li>Strawberry</li></ul>';
            _run(template, args, result);
        });

        it('should work with switch statements', function() {
            var template = '{% switch (fruit) %}{% case "Blueberry" %}Muffin{% break %}{% case "Banana" %}Split{% break %}{% default %}Nothing{% break %}{% end %}';
            var args = {};
            var result = 'Nothing';
            _run(template, args, result);

            args = {fruit: 'Blueberry'};
            result = 'Muffin';
            _run(template, args, result);

            args = {fruit: 'Banana'};
            result = 'Split';
            _run(template, args, result);
        });

        it('should let you render other views', function() {
            var context = {
                render : function(view) {
                    return "<footer>View is " + view + "</footer>";
                }
            };
            var template = '<h1>Hello</h1>{% render("footer") %}';
            var args = {};
            _run(template, args, '<h1>Hello</h1><footer>View is footer</footer>', context);
        });

        it('should strip extension when rendering other views', function() {
            var context = {
                render : function(view) {
                    return "<footer>View is " + view + "</footer>";
                }
            };
            var template = '<h1>Hello</h1>{% render("footer.html") %}';
            var args = {};
            _run(template, args, '<h1>Hello</h1><footer>View is footer</footer>', context);
        });

        it('should let you escape variables', function() {
            var context = {
                escape: function(string) {
                    return 'Escaped: ' + string;
                }
            };
            var template = '<title>{% escape(title) %}</title>';
            var args = {title: 'Whatever'};
            _run(template, args, '<title>Escaped: Whatever</title>', context);
        });

         it('should let you use helper functions', function() {
            var context = {
                helpers: {
                    capitalize: function(string) {
                        return string.toUpperCase();
                    }
                }
            };

            var template = '<title>{% capitalize(title) %}</title>';
            var args = {title: 'Whatever'};
            _run(template, args, '<title>WHATEVER</title>', context);
        });

         it('should not render "undefined" if helper returns undefined', function() {
            var context = {
                helpers: {
                    addJavascript: function() {}
                }
            };

            var template = '{% addJavascript("file.js") %}';
            _run(template, {}, '', context);
         });

         it('should let you extend other templates', function() {
            var master = '<h1>{{ title }}</h1><p>{{ content }}</p>';
            var child = '{% extends master %}{% block title %}Hello!{% end %} {% block content %}This is a sentence.{% end %}';
            var context = {
                render: function(name, args) {
                    if (name == 'master') {
                        return aftershave.render(master, args);
                    }
                }
            };
            _run(child, {}, '<h1>Hello!</h1><p>This is a sentence.</p>', context);

            // extend instead of extends
            child = '{% extend master %}{% block title %}Hello!{% end %} {% block content %}This is a sentence.{% end %}';
            _run(child, {}, '<h1>Hello!</h1><p>This is a sentence.</p>', context);

            // dynamic title
            child = '{% extend master %}{% block title %}{{ title }}{% end %} {% block content %}This is a sentence.{% end %}';
            _run(child, {title: 'Dynamic!'}, '<h1>Dynamic!</h1><p>This is a sentence.</p>', context);
         });

        it('should let you extend with default blocks', function() {
            var master = '<title>{% block title %}Default Title{% end %}</title>';
            var child = '{% extends master %}';
            var context = {
                render: function(name, args) {
                    if (name == 'master') {
                        return aftershave.render(master, args);
                    }
                }
            };
            _run(child, {}, '<title>Default Title</title>', context);

            child = '{% extends master %}{% block title %}New Title{% end %}';
            _run(child, {}, '<title>New Title</title>', context);

            // if else statement
            child = '{% extend master %}{% block title %}{% if (one) %}One.{% else %}Two.{% end %}{% end %}';
            _run(child, {one: true}, '<title>One.</title>', context);
        });

        it('should allow other variable definitions', function() {
            _run('{% var name = "John"; %}{% if (passedName) { name = passedName; } %}<h1>{{ name }}</h1>', {}, '<h1>John</h1>');
            _run('{% var name = "John"; %}{% if (passedName) { name = passedName; } %}<h1>{{ name }}</h1>', {passedName: 'Craig'}, '<h1>Craig</h1>');
        });

        it('should strip html comments', function() {
            _run('<!-- some comment -->\n<div class="hello">Hello</div>', {}, '<div class="hello">Hello</div>');
        });

        it('should preserve whitespace on a single line', function() {
            _run('<form method="post" action="/" class="sign-in{% if (error) %} error{% end %}">', {error: true}, '<form method="post" action="/" class="sign-in error">');
        });

        it('should allow native javascript functions', function() {
            _run('Url is http://something.com/?email={{ encodeURIComponent(email) }}', {email: 'whatever@something.com'}, 'Url is http://something.com/?email=whatever%40something.com');
            _run('Url is http://something.com/?email={% encodeURIComponent(email) %}', {email: 'whatever@something.com'}, 'Url is http://something.com/?email=whatever%40something.com');
        });

        it('should allow native javascript objects', function() {
            _run('Look at the json: {{ JSON.stringify(something) }}', {something: {test: 123}}, 'Look at the json: {"test":123}');
        });

        it('should pass args to parent template', function() {
            var master = '<h1>{% if (currentUser) %}Logged In as {{ currentUser.name }}{% else %}Logged Out{% end %}</h1><p>{{ content }}</p>';
            var child = '{% extends master %}{% block content %}Content goes here.{% end %}';
            var context = {
                render: function(name, args) {
                    if (name == 'master') {
                        return aftershave.render(master, args);
                    }
                }
            };
            _run(child, {currentUser: {name: 'Craig'}}, '<h1>Logged In as Craig</h1><p>Content goes here.</p>', context);
        });

        it('should allow console logs', function() {
            _run('{% console.log(something) %}', {something: true}, '');
        });

        it('should not have undefined variables with child templates', function() {
            var master = '{% block content %}{% end %}';
            var child = '{% extends master %}{% block content %}{% if (results) %}<h1>Search Results</h1>{% else %}<h1>No Results</h1>{% end %}{% end %}';
            var context = {
                render: function(name, args) {
                    if (name == 'master') {
                        return aftershave.render(master, args);
                    }
                }
            };
            _run(child, {results: false}, '<h1>No Results</h1>', context);
        });

        it('should allow directories in partial views', function() {
            var template = '{% render(\'helper/tip.phtml\', {message: message}) %}';
            var context = {
                render: function(name, args) {
                    if (name == 'helper/tip') {
                        return args.message;
                    }
                }
            };
            _run(template, {message: 'Hello!'}, 'Hello!', context);
        });

        it('should use helpers inside of an if statement', function() {
            var template = '{% if (showTip("something")) %}<div class="tip">This is a tip</div>{% end %}';
            var context = {
                helpers: {
                    showTip: function () {
                        return true;
                    }
                }
            };
            _run(template, {}, '<div class="tip">This is a tip</div>', context);
        });

        it('should use args if args is specified explicitly', function() {
            var template = '{% if (args.showTip("something")) %}<div class="tip">This is a tip</div>{% end %}';
            _run(template, {showTip: function() {return true;}}, '<div class="tip">This is a tip</div>');
        });
    });
}) ();
