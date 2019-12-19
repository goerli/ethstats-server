const scripts = [
  'src/client/js/app.js',
  'src/client/js/controllers.js',
  'src/client/js/filterFunctions.js',
  'src/client/js/filters.js',
  'src/client/js/directives.js',
  'src/client/js/script.js'
]

const vendor = [
  'node_modules/jquery/dist/jquery.min.js',
  'node_modules/popper.js/dist/umd/popper.min.js',
  'node_modules/bootstrap/dist/js/bootstrap.min.js',
  'node_modules/angular/angular.min.js',
  'node_modules/ngstorage/ngStorage.min.js',
  'node_modules/lodash/lodash.min.js',
  'node_modules/d3/dist/d3.min.js',
  'node_modules/d3-tip/dist/index.js',
  'node_modules/moment/min/moment.min.js',
  'node_modules/moment/locale/en.js',
  'node_modules/toastr/build/toastr.min.js',
  'node_modules/jquery-sparkline/jquery.sparkline.min.js'
]

const styles = [
  'node_modules/bootstrap/dist/css/bootstrap.min.css',
  'node_modules/bootstrap/dist/css/bootstrap.min.css.map',
  'src/client/css/minimal-icons-embedded.css',
  'node_modules/toastr/build/toastr.min.css',
  'src/client/css/style.css'
]

module.exports = function (grunt) {
  scripts.unshift(
    grunt.option('configPath') || 'src/client/js/defaultConfig.js'
  )

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: {
      build: ['dist'],
      js: ['dist/js/*.*', '!dist/js/netstats.*'],
      css: ['dist/css/*.css', '!dist/css/netstats.*.css']
    },
    watch: {
      css: {
        files: ['src/client/css/*.css'],
        tasks: ['default']
      },
      js: {
        files: ['src/client/js/*.js'],
        tasks: ['default']
      },
      html: {
        files: ['src/client/views/*.jade'],
        tasks: ['default']
      }
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
          'dist/index.html': 'src/client/views/index.jade'
        }
      }
    },
    copy: {
      build: {
        files: [
          {
            expand: true,
            cwd: 'src/client/fonts/',
            src: ['*.*'],
            dest: 'dist/fonts/',
            filter: 'isFile'
          },
          {
            expand: true,
            cwd: 'src/client/images/',
            src: ['*.*'],
            dest: 'dist/',
            filter: 'isFile'
          },
          {
            expand: true,
            flatten: true,
            src: styles,
            dest: 'dist/css/',
            filter: 'isFile'
          },
          {
            expand: true,
            cwd: 'src/client/js/lib/',
            src: ['*.*'],
            dest: 'dist/js/lib'
          }
        ]
      },
    },
    cssmin: {
      build: {
        files: [{
          expand: true,
          cwd: 'dist/css',
          src: ['*.css', '!*.min.css'],
          dest: 'dist/css/'
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
      scripts: {
        options: {
          separator: ';\n',
        },
        src: scripts,
        dest: 'dist/js/netstats.js'
      },
      netstats: {
        options: {
          sourceMap: false,
          sourceMapIncludeSources: true,
          sourceMapIn: [
            'dist/js/vendor.min.js.map',
            'dist/js/netstats.min.js.map'
          ]
        },
        src: ['<%= concat.vendor.dest %>', '<%= uglify.app.dest %>'],
        dest: 'dist/js/netstats.min.js',
        nonull: true
      },
      css: {
        src: ['dist/css/*.min.css', 'dist/css/*.css'],
        dest: 'dist/css/netstats.min.css'
      }
    },
    uglify: {
      app: {
        options: {
          mangle: false,
          sourceMap: true,
          sourceMapIncludeSources: true,
          compress: true
        },
        dest: 'dist/js/netstats.min.js',
        src: ['<%= concat.scripts.dest %>']
      }
    }
  })

  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-contrib-concat')
  grunt.loadNpmTasks('grunt-contrib-jade')
  grunt.loadNpmTasks('grunt-contrib-cssmin')
  grunt.loadNpmTasks('grunt-contrib-uglify')
  grunt.loadNpmTasks('grunt-contrib-watch')

  grunt.registerTask('build', [
    'jade:build',
    'copy:build',
    'cssmin:build',
    'concat:vendor',
    'concat:scripts',
    'uglify:app',
    'concat:netstats',
    'concat:css',
  ])
  grunt.registerTask('default', [
    'clean:build',
    'clean:js',
    'clean:css',
    'build',
    'clean:js',
    'clean:css'
  ])
}
