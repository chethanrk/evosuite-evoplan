/**
 * Created by Michaela on 10/10/2017.
 */

module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-openui5');

    grunt.initConfig({
        openui5_preload: {
            component: {
                options: {
                    resources: {
                        cwd: '',
                        prefix: 'com/evorait/evoplan',
                        src: [
                            './view/**/*.fragment.xml',
                            './view/**/*.view.xml',
                            './block/**/*.fragment.xml',
                            './block/**/*.view.xml'
                        ]
                    },
                    dest: ''
                },
                components: true
            }
        }
    });

    // Default task(s).
    grunt.registerTask('default', ['openui5_preload']);

};