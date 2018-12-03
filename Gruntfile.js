var src = 'src/';
var dest = 'dist/';

var scripts = [
	'src/js/app.js',
	'src/js/controllers.js',
	'src/js/filters.js',
	'src/js/directives.js',
	'src/js/script.js'
];

var vendor = [
	'dist/js/lib/jquery-1.11.3.min.js',
	'dist/js/lib/bootstrap.min.js',
	'dist/js/lib/angular.min.js',
	'dist/js/lib/ngStorage.min.js',
	'dist/js/lib/lodash.min.js',
	'dist/js/lib/d3.min.js',
	'dist/js/lib/d3.tip.min.js',
	'dist/js/lib/topojson.min.js',
	'dist/js/lib/datamaps.min.js',
	'dist/js/lib/moment.min.js',
	'dist/js/lib/moment.en.min.js',
	'dist/js/lib/toastr.min.js',
	'dist/js/lib/jquery.sparkline.min.js',
	'dist/js/lib/primus.min.js'
];

var styles = [
	'bootstrap.min.css',
	'minimal-icons-embedded.css',
	'toastr.min.css',
	'style.css'
];

var src_pow = 'src/pow/';
var dest_pow = 'dist/pow/';

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
			build: ['dist'],
			cleanup_js: ['dist/js/*.*', '!dist/js/netstats.*'],
			cleanup_css: ['dist/css/*.css', '!dist/css/netstats.*.css'],
			build_pow: ['dist/pow'],
			cleanup_js_pow: ['dist/pow/js/*.*', '!dist/pow/js/netstats.*'],
			cleanup_css_pow: ['dist/pow/css/*.css', '!dist/pow/css/netstats.*.css']
		},
		jade: {
			build: {
				options: {
					data: {
						debug: false,
						pretty: true
					}
				},
				files: {
					'dist/index.html': 'src/views/index.jade'
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
			build: {
				files: [
					{
						expand: true,
						cwd: 'src/fonts/',
						src: ['minimal-*.*'],
						dest: 'dist/fonts/',
						filter: 'isFile'
					},
					{
						expand: true,
						cwd: 'src/images/',
						src: ['*.ico'],
						dest: 'dist/',
						filter: 'isFile'
					},
					{
						expand: true,
						cwd: 'src/css/',
						src: styles,
						dest: 'dist/css/',
						filter: 'isFile'
					},
					{
						expand: true,
						cwd: 'src/js/lib/',
						src: ['*.*'],
						dest: 'dist/js/lib'
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
			build: {
				files: [{
					expand: true,
					cwd: 'dist/css',
					src: ['*.css', '!*.min.css'],
					dest: 'dist/css/'
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
			vendor: {
				options: {
					souceMap: false,
					sourceMapIncludeSources: true,
					sourceMapIn: ['dist/js/lib/*.map']
				},
				src: vendor,
				dest: 'dist/js/vendor.min.js'
			},
			scripts : {
				options: {
					separator: ';\n',
				},
				src: scripts,
				dest: 'dist/js/app.js'
			},
			netstats: {
				options: {
					sourceMap: false,
					sourceMapIncludeSources: true,
					sourceMapIn: ['dist/js/vendor.min.js.map', 'dist/js/app.min.js.map']
				},
				src: ['<%= concat.vendor.dest %>', '<%= uglify.app.dest %>'],
				dest: 'dist/js/netstats.min.js',
				nonull: true
			},
			css: {
				src: ['dist/css/*.min.css', 'dist/css/*.css'],
				dest: 'dist/css/netstats.min.css'
			},
			vendor: {
				options: {
					sourceMap: false,
					sourceMapIncludeSources: true,
					sourceMapIn: ['dist/pow/js/lib/*.map']
				},
				src: vendor,
				dest: 'dist/pow/js/vendor.min.js'
			},
			scripts : {
				options: {
					separator: ';\n',
				},
				src: scripts,
				dest: 'dist/pow/js/app.js'
			},
			netstats_pow: {
				options: {
					sourceMap: false,
					sourceMapIncludeSources: true,
					sourceMapIn: ['dist/pow/js/vendor.min.js.map', 'dist/pow/js/app.min.js.map']
				},
				src: ['<%= concat.vendor.dest %>', '<%= uglify.app_pow.dest %>'],
				dest: 'dist/pow/js/netstats.min.js',
				nonull: true,
			},
			css_pow: {
				src: ['dist/pow/css/*.min.css', 'dist/pow/css/*.css'],
				dest: 'dist/pow/css/netstats.min.css'
			}
		},
		uglify: {
			app: {
				options: {
					mangle: false,
					sourceMap: false,
					sourceMapIncludeSources: true
				},
				dest: 'dist/js/app.min.js',
				src: ['<%= concat.scripts.dest %>']
			},
			app_pow: {
				options: {
					mangle: false,
					sourceMap: false,
					sourceMapIncludeSources: true
				},
				dest: 'dist/pow/js/app.min.js',
				src: ['<%= concat.scripts.dest %>']
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-jade');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	grunt.registerTask('default', ['clean:build', 'clean:cleanup_js', 'clean:cleanup_css', 'jade:build', 'copy:build', 'cssmin:build', 'concat:vendor', 'concat:scripts', 'uglify:app', 'concat:netstats', 'concat:css', 'clean:cleanup_js', 'clean:cleanup_css']);
	grunt.registerTask('pow', ['clean:build_pow', 'clean:cleanup_js_pow', 'clean:cleanup_css_pow', 'jade:build_pow', 'copy:build_pow', 'cssmin:build_pow', 'concat:vendor', 'concat:scripts', 'uglify:app_pow', 'concat:netstats_pow', 'concat:css_pow', 'clean:cleanup_js_pow', 'clean:cleanup_css_pow']);
	grunt.registerTask('build',   'default');
	grunt.registerTask('all',   ['default', 'pow']);
};
