/**
 * Created by Michaela on 10/10/2017.
 * grunt build: creates Component-preload.js
 */

module.exports = function(grunt) {

    grunt.initConfig({
        copy: {
            lang: {
                files: [
                    {src: 'i18n/i18n_en.properties', dest: 'i18n/i18n.properties'}
                ]
            }
        },
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
    grunt.loadNpmTasks('grunt-contrib-copy');

    grunt.registerTask('minimize', ['openui5_preload']);
    grunt.registerTask('copy-lang', ['copy:lang']);

    grunt.registerTask('default', ['copy:lang', 'openui5_preload']);
};