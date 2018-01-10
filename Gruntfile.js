/**
 * Created by Michaela on 10/10/2017.
 */

module.exports = function(grunt) {

    grunt.initConfig({
        openui5_preload: {
            component: {
                options: {
                    resources: {
                        cwd: '.',
                        prefix: 'com/evorait/evoplan',
                        src: [
                            'view/**/*.fragment.xml',
                            'view/**/*.view.xml',
                            'block/**/*.view.xml',
                            'model/**/*.js',
                            'controller/**/*.js',
                            'block/**/*.js',
                            'dev/**/*.js',
                            'i18n/*.properties',
                            'Component.js'
                        ]
                    },
                    dest: '.'
                },
                components: 'com/evorait/evoplan'
            }
        }
    });

    grunt.loadNpmTasks('grunt-openui5');

    grunt.registerTask('default', ['openui5_preload']);

};