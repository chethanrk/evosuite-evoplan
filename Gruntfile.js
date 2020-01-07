module.exports = function (grunt) {
	"use strict";
	
	var config = {
		copy: {
            lang: {
                files: [
                    {
                    	src: "webapp/i18n/i18n_en.properties", 
                    	dest: "dist/i18n/i18n.properties"
                    },
                    {
                    	src: "webapp/i18n/i18n_en.properties", 
                    	dest: "webapp/i18n/i18n.properties"
                    }
                ]
            }
        }	
	};
	
	grunt.loadNpmTasks("@sap/grunt-sapui5-bestpractice-build");
	grunt.config.merge(config);
	grunt.registerTask("copy-lang", ["copy:lang"]);
	grunt.registerTask("default", [
		"clean",
		"lint",
		"build",
		"copy:lang"
	]);
	grunt.loadNpmTasks("@sap/grunt-sapui5-bestpractice-test");
	grunt.registerTask("unit_and_integration_tests", ["test"]);
	grunt.config.merge({
		coverage_threshold: {
			statements: 0,
			branches: 100,
			functions: 0,
			lines: 0
		}
	});
};