/* global describe, it */
(function() {
    'use strict';

    var expect = require('chai').expect;
    var razor = require('../src/razor.js');

    function _run(template, args, expected, context) {
        var actual = razor.render(template, args, context);
        expect(actual).to.equal(expected);
    }

    describe('Testing Razor.render', function() {
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
            _run(template, args, result, context);
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
                render : function(string) {
                    return "<footer>More content</footer>";
                }
            };
            var template = '<h1>Hello</h1>{% render("footer") %}';
            var args = {};
            _run(template, args, '<h1>Hello</h1><footer>More content</footer>', context);
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
    });
}) ();
