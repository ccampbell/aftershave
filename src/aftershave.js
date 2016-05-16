/* jshint node:true */
var _ = require('lodash');

var compile = require('./helpers/compile');
var render = require('./helpers/render');
var templateToJavascript = require('./helpers/templateToJavascript');
var templateNameFromPath = require('./helpers/templateNameFromPath');

var compiler;

var Aftershave = (function() {
    'use strict';

    var defaultOptions = {
        alone: false,
        ugly: false,
        exports: false,
        addDefault: false
    };

    var options = {};

    return {
        generate: function(string) {
            return templateToJavascript(string, options);
        },

        compile: function(string) {
            return compile(string, options);
        },

        render: function(string, args, context) {
            return render(string, args, context, options);
        },

        templateNameFromPath: templateNameFromPath,

        setOptions: function(opts) {
            options = _.extend({}, defaultOptions, opts);
        },

        process: function() {
            if (!compiler) {
                compiler = require('./compiler.js');
            }
            var instance = new compiler.Compiler(options);
            instance.process.apply(instance, arguments);
        }
    };
}) ();

module.exports = Aftershave;
