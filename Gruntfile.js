var src_poa = 'src/poa/';
var dest_poa = 'dist/poa/';

var scripts_poa = [
	'src/poa/js/app.js',
	'src/poa/js/controllers.js',
	'src/poa/js/filters.js',
	'src/poa/js/directives.js',
	'src/poa/js/script.js'
];

var vendor_poa = [
	'dist/poa/js/lib/jquery-1.11.3.min.js',
	'dist/poa/js/lib/bootstrap.min.js',
	'dist/poa/js/lib/angular.min.js',
	'dist/poa/js/lib/ngStorage.min.js',
	'dist/poa/js/lib/lodash.min.js',
	'dist/poa/js/lib/d3.min.js',
	'dist/poa/js/lib/d3.tip.min.js',
	'dist/poa/js/lib/topojson.min.js',
	'dist/poa/js/lib/datamaps.min.js',
	'dist/poa/js/lib/moment.min.js',
	'dist/poa/js/lib/moment.en.min.js',
	'dist/poa/js/lib/toastr.min.js',
	'dist/poa/js/lib/jquery.sparkline.min.js',
	'dist/poa/js/lib/primus.min.js'
];

var styles_poa = [
	'bootstrap.min.css',
	'minimal-icons-embedded.css',
	'toastr.min.css',
	'style.css'
];

var src_pow = 'src/pow/';
var dest_pow = 'dist/pow/';

var scripts_pow = [
	'src/pow/js/app.js',
	'src/pow/js/controllers.js',
	'src/pow/js/filters.js',
	'src/pow/js/directives.js',
	'src/pow/js/script.js'
];

var vendor_pow = [
	'dist/pow/js/lib/jquery-1.11.3.min.js',
	'dist/pow/js/lib/bootstrap.min.js',
	'dist/pow/js/lib/angular.min.js',
	'dist/pow/js/lib/lodash.min.js',
	'dist/pow/js/lib/d3.min.js',
	'dist/pow/js/lib/d3.tip.min.js',
	'dist/pow/js/lib/moment.min.js',
	'dist/pow/js/lib/moment.en.min.js',
	'dist/pow/js/lib/toastr.min.js',
	'dist/pow/js/lib/jquery.sparkline.min.js',
	'dist/pow/js/lib/primus.min.js'
];

var styles_pow = [
	'bootstrap.min.css',
	'minimal-icons-embedded.css',
	'toastr.min.css',
	'style.css'
];

module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		clean: {
			build_poa: ['dist/poa'],
			cleanup_js_poa: ['dist/poa/js/*.*', '!dist/poa/js/netstats.*'],
			cleanup_css_poa: ['dist/poa/css/*.css', '!dist/poa/css/netstats.*.css'],
			build_pow: ['dist/pow'],
			cleanup_js_pow: ['dist/pow/js/*.*', '!dist/pow/js/netstats.*'],
			cleanup_css_pow: ['dist/pow/css/*.css', '!dist/pow/css/netstats.*.css']
		},
		jade: {
			build_poa: {
				options: {
					data: {
						debug: false,
						pretty: true
					}
				},
				files: {
					'dist/poa/index.html': 'src/poa/views/index.jade'
				}
			},
			build_pow: {
				options: {
					data: {
						debug: false,
						pretty: true
					}
				},
				files: {
					'dist/pow/index.html': 'src/pow/views/index.jade'
				}
			}
		},
		copy: {
			build_poa: {
				files: [
					{
						expand: true,
						cwd: 'src/poa/fonts/',
						src: ['minimal-*.*'],
						dest: 'dist/poa/fonts/',
						filter: 'isFile'
					},
					{
						expand: true,
						cwd: 'src/poa/images/',
						src: ['*.ico'],
						dest: 'dist/poa/',
						filter: 'isFile'
					},
					{
						expand: true,
						cwd: 'src/poa/css/',
						src: styles_poa,
						dest: 'dist/poa/css/',
						filter: 'isFile'
					},
					{
						expand: true,
						cwd: 'src/poa/js/lib/',
						src: ['*.*'],
						dest: 'dist/poa/js/lib'
					}
				]
			},
			build_pow: {
				files: [
					{
						expand: true,
						cwd: 'src/pow/fonts/',
						src: ['minimal-*.*'],
						dest: 'dist/pow/fonts/',
						filter: 'isFile'
					},
					{
						expand: true,
						cwd: 'src/pow/images/',
						src: ['*.ico'],
						dest: 'dist/pow/',
						filter: 'isFile'
					},
					{
						expand: true,
						cwd: 'src/pow/css/',
						src: styles_pow,
						dest: 'dist/pow/css/',
						filter: 'isFile'
					},
					{
						expand: true,
						cwd: 'src/pow/js/lib/',
						src: ['*.*'],
						dest: 'dist/pow/js/lib'
					}
				]
			}
		},
		cssmin: {
			build_poa: {
				files: [{
					expand: true,
					cwd: 'dist/poa/css',
					src: ['*.css', '!*.min.css'],
					dest: 'dist/poa/css/'
				}]
			},
			build_pow: {
				files: [{
					expand: true,
					cwd: 'dist/pow/css',
					src: ['*.css', '!*.min.css'],
					dest: 'dist/pow/css/'
				}]
			}
		},
		concat: {
			vendor_poa: {
				options: {
					souceMap: false,
					sourceMapIncludeSources: true,
					sourceMapIn: ['dist/poa/js/lib/*.map']
				},
				src: vendor_poa,
				dest: 'dist/poa/js/vendor.min.js'
			},
			scripts_poa : {
				options: {
					separator: ';\n',
				},
				src: scripts_poa,
				dest: 'dist/poa/js/app.js'
			},
			netstats_poa: {
				options: {
					sourceMap: false,
					sourceMapIncludeSources: true,
					sourceMapIn: ['dist/poa/js/vendor.min.js.map', 'dist/poa/js/app.min.js.map']
				},
				src: ['<%= concat.vendor_poa.dest %>', '<%= uglify.app_poa.dest %>'],
				dest: 'dist/poa/js/netstats.min.js',
				nonull: true
			},
			css_poa: {
				src: ['dist/poa/css/*.min.css', 'dist/poa/css/*.css'],
				dest: 'dist/poa/css/netstats.min.css'
			},
			vendor_pow: {
				options: {
					sourceMap: false,
					sourceMapIncludeSources: true,
					sourceMapIn: ['dist/pow/js/lib/*.map']
				},
				src: vendor_pow,
				dest: 'dist/pow/js/vendor.min.js'
			},
			scripts_pow : {
				options: {
					separator: ';\n',
				},
				src: scripts_pow,
				dest: 'dist/pow/js/app.js'
			},
			netstats_pow: {
				options: {
					sourceMap: false,
					sourceMapIncludeSources: true,
					sourceMapIn: ['dist/pow/js/vendor.min.js.map', 'dist/pow/js/app.min.js.map']
				},
				src: ['<%= concat.vendor_pow.dest %>', '<%= uglify.app_pow.dest %>'],
				dest: 'dist/pow/js/netstats.min.js',
				nonull: true,
			},
			css_pow: {
				src: ['dist/pow/css/*.min.css', 'dist/pow/css/*.css'],
				dest: 'dist/pow/css/netstats.min.css'
			}
		},
		uglify: {
			app_poa: {
				options: {
					mangle: false,
					sourceMap: false,
					sourceMapIncludeSources: true
				},
				dest: 'dist/poa/js/app.min.js',
				src: ['<%= concat.scripts_poa.dest %>']
			},
			app_pow: {
				options: {
					mangle: false,
					sourceMap: false,
					sourceMapIncludeSources: true
				},
				dest: 'dist/pow/js/app.min.js',
				src: ['<%= concat.scripts_pow.dest %>']
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-jade');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	grunt.registerTask('poa', ['clean:build_poa', 'clean:cleanup_js_poa', 'clean:cleanup_css_poa', 'jade:build_poa', 'copy:build_poa', 'cssmin:build_poa', 'concat:vendor_poa', 'concat:scripts_poa', 'uglify:app_poa', 'concat:netstats_poa', 'concat:css_poa', 'clean:cleanup_js_poa', 'clean:cleanup_css_poa']);
	grunt.registerTask('pow', ['clean:build_pow', 'clean:cleanup_js_pow', 'clean:cleanup_css_pow', 'jade:build_pow', 'copy:build_pow', 'cssmin:build_pow', 'concat:vendor_pow', 'concat:scripts_pow', 'uglify:app_pow', 'concat:netstats_pow', 'concat:css_pow', 'clean:cleanup_js_pow', 'clean:cleanup_css_pow']);
	grunt.registerTask('default', 'poa');
	grunt.registerTask('build',   'default');
	grunt.registerTask('all',   ['poa', 'pow']);
};
