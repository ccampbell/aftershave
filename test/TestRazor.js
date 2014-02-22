/* global describe, it */
(function() {
    'use strict';

    var expect = require('chai').expect;
    var razor = require('../src/razor.js');

    function _run(template, args, expected) {
        var actual = razor.render(template, args);
        expect(actual).to.equal(expected);
    }

    describe('Testing Razor.render', function() {
        it('simple', function() {
            _run('<h1>Hello</h1>', {}, '<h1>Hello</h1>');
        });

        it('variable', function() {
            _run('<h1>Hello {{ name }}!</h1>', {name: 'Craig'}, '<h1>Hello Craig!</h1>');
        });

        it('variable no spaces', function() {
            _run('<h1>Hello {{name}}!</h1>', {name: 'Craig'}, '<h1>Hello Craig!</h1>');
        });

        it('if statement failure', function() {
            _run('<h1>Hello {% if (name) %}{{ name }}{% else %}Person{% end %}!</h1>', {}, '<h1>Hello Person!</h1>');
        });

        it('if statement success', function() {
            _run('<h1>Hello {% if (name) %}{{ name }}{% else %}Person{% end %}!</h1>', {name: 'Craig'}, '<h1>Hello Craig!</h1>');
        });
    });
}) ();
