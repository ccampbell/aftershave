/*jshint node:true */
module.exports = function(grunt) {
    'use strict';

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        jshint: {
            options: grunt.file.readJSON('.jshintrc'),
            src: [
                'Gruntfile.js',
                'src/compiler.js',
                'src/razor.js',
                'test/TestRazor.js'
            ]
        },

        simplemocha: {
            options: {
                globals: ['assert'],
                timeout: 3000,
                ignoreLeaks: false,
                ui: 'bdd',
                reporter: 'Nyan'
            },

            all: {
                src: ['test/Test*.js']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-simple-mocha');
    grunt.loadTasks('grunt-task');

    var testTasks = ['jshint', 'simplemocha'];
    grunt.registerTask('test', testTasks);

    grunt.registerTask('default', ['test']);
};
