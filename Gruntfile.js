'use strict'

const sass = require('node-sass');

module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt)

  // Project Configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    exec: {
      splashicon: {
        command: 'cordova-splash && cordova-icon && rm -rf resources/canoe/android/splash && mv platforms/android/res resources/canoe/android/splash'
      },
      desktopLinux: {
        command: 'sed s/VERSION/<%= pkg.version %>/g < resources/canoe/linux/canoe.desktop > build/canoe/canoe.desktop'
      },
      appConfig: {
        command: 'node ./util/buildAppConfig.js'
      },
      clean: {
        command: 'rm -Rf bower_components node_modules'
      },
      cordovaclean: {
        command: 'make -C cordova clean'
      },
      macos: {
        command: 'sh build/build-macos.sh sign'
      },
      coveralls: {
        command: 'cat  coverage/report-lcov/lcov.info |./node_modules/coveralls/bin/coveralls.js'
      },
      chrome: {
        command: 'make -C chrome-app '
      },
      wpinit: {
        command: 'make -C cordova wp-init'
      },
      wpcopy: {
        command: 'make -C cordova wp-copy'
      },
      iosdebug: {
        command: 'npm run build:ios'
      },
      ios: {
        command: 'npm run build:ios-release'
      },
      xcode: {
        command: 'npm run open:ios'
      },
      androiddebug: {
        command: 'npm run build:android'
      },
      android: {
        command: 'npm run build:android-release'
      },
      androidrun: {
        command: 'npm run run:android && npm run log:android'
      },
      androidbuild: {
        command: 'cd cordova/project && cordova build android --release'
      },
      cleanbuild: {
        cmd: 'rm -rf build/canoe'
      },
      powbuild: {
        cmd: 'cd node_modules/raiblocks-pow && nw-gyp rebuild --target=<%= pkg.build.nwVersion %> --arch=x64 '
      },
      ziposx: {
        cmd: 'cd build/canoe && mv osx64 canoe-osx64-<%= pkg.version %> && rm -f ../canoe-osx64-<%= pkg.version %>.zip && zip -r --symlinks ../canoe-osx64-<%= pkg.version %>.zip canoe-osx64-<%= pkg.version %>/'
      },
      ziplinux: {
        cmd: 'cd build/canoe && mv linux64 canoe-linux64-<%= pkg.version %> && rm -f ../canoe-linux64-<%= pkg.version %>.zip && zip -r --symlinks ../canoe-linux64-<%= pkg.version %>.zip canoe-linux64-<%= pkg.version %>/'
      },
      zipwin: {
        cmd: 'cd build/canoe && mv win64 canoe-win64-<%= pkg.version %> && rm -f ../canoe-win64-<%= pkg.version %>.zip && zip -r --symlinks ../canoe-win64-<%= pkg.version %>.zip canoe-win64-<%= pkg.version %>/'
      },
      zipwin32: {
        cmd: 'cd build/canoe && mv win32 canoe-win32-<%= pkg.version %> && rm -f ../canoe-win32-<%= pkg.version %>.zip && zip -r --symlinks ../canoe-win32-<%= pkg.version %>.zip canoe-win32-<%= pkg.version %>/'
      },
      appimage: {
        cmd: 'cd build/canoe && cp -a ../../resources/canoe/linux/AppRun canoe-linux64-<%= pkg.version %>/ && ARCH=x86_64 appimagetool canoe-linux64-<%= pkg.version %> && mv Canoe-x86_64.AppImage ../canoe-linux64-<%= pkg.version %>.AppImage'
      },
      desktopsign: {
        cmd: 'gpg -u E7ADC266 --output build/canoe-linux64-<%= pkg.version %>.zip.sig --detach-sig build/canoe-linux64-<%= pkg.version %>.zip ; gpg -u E7ADC266 --output build/canoe-linux64-<%= pkg.version %>.AppImage.sig --detach-sig build/canoe-linux64-<%= pkg.version %>.AppImage ;gpg -u E7ADC266 --output build/canoe-win64-<%= pkg.version %>.zip.sig --detach-sig build/canoe-win64-<%= pkg.version %>.zip ; gpg -u E7ADC266 --output build/canoe-win32-<%= pkg.version %>.zip.sig --detach-sig build/canoe-win32-<%= pkg.version %>.zip ; gpg -u E7ADC266 --output build/canoe-osx64-<%= pkg.version %>.zip.sig --detach-sig build/canoe-osx64-<%= pkg.version %>.zip'
      },
      desktopverify: {
        cmd: 'gpg --verify build/canoe-linux64-<%= pkg.version %>.zip.sig build/canoe-linux64-<%= pkg.version %>.zip; gpg --verify build/canoe-linux64-<%= pkg.version %>.AppImage.sig build/canoe-linux64-<%= pkg.version %>.AppImage; gpg --verify build/canoe-win64-<%= pkg.version %>.zip.sig build/canoe-win64-<%= pkg.version %>.zip ; gpg --verify build/canoe-win32-<%= pkg.version %>.zip.sig build/canoe-win32-<%= pkg.version %>.zip ;gpg --verify build/canoe-osx64-<%= pkg.version %>.zip.sig build/canoe-osx64-<%= pkg.version %>.zip'
      },
      dmgsign: {
        cmd: 'gpg -u E7ADC266 --output build/canoe-osx64-<%= pkg.version %>.dmg.sig --detach-sig build/canoe-osx64-<%= pkg.version %>.dmg'
      },
      dmgverify: {
        cmd: 'gpg --verify build/canoe-osx64-<%= pkg.version %>.dmg.sig build/canoe-osx64-<%= pkg.version %>.dmg'
      },
      osxsign: {
        cmd: 'gpg -u E7ADC266 --output build/canoe.dmg.sig --detach-sig build/canoe.dmg'
      }
    },
    watch: {
      options: {
        dateFormat: function (time) {
          grunt.log.writeln('The watch finished in ' + time + 'ms at ' + (new Date()).toString())
          grunt.log.writeln('Waiting for more changes...')
        }
      },
      sass: {
        files: ['src/sass/**/**/*.scss'],
        tasks: ['sass']
      },
      main: {
        files: [
          'src/js/init.js',
          'src/js/app.js',
          'src/js/raiwallet.js',
          'src/js/directives/*.js',
          'src/js/filters/*.js',
          'src/js/routes.js',
          'src/js/services/*.js',
          'src/js/models/*.js',
          'src/js/controllers/**/*.js'
        ],
        tasks: ['concat:js']
      },
      gettext: {
        files: [
          'i18n/po/*.po',
          'i18n/po/*.pot'
        ],
        tasks: ['nggettext_compile', 'concat']
      }
    },
    sass: {
      dist: {
        options: {
          implementation: sass,
          style: 'compact',
          sourcemap: 'none'
        },
        files: [{
          expand: true,
          flatten: true,
          src: ['src/sass/main.scss'],
          dest: 'www/css/',
          ext: '.css'
        }]
      }
    },
    concat: {
      options: {
        sourceMap: false,
        sourceMapStyle: 'link' // embed, link, inline
      },
      angular: {
        src: [
          'bower_components/qrcode-generator/js/qrcode.js',
          'bower_components/qrcode-generator/js/qrcode_UTF8.js',
          'bower_components/moment/min/moment-with-locales.js',
          'bower_components/angular-moment/angular-moment.js',
          'bower_components/ng-lodash/build/ng-lodash.js',
          'bower_components/angular-qrcode/angular-qrcode.js',
          'bower_components/angular-gettext/dist/angular-gettext.js',
          'bower_components/ng-csv/build/ng-csv.js',
          'bower_components/ionic-toast/dist/ionic-toast.bundle.min.js',
          'bower_components/angular-clipboard/angular-clipboard.js',
          'bower_components/angular-md5/angular-md5.js',
          'bower_components/angular-mocks/angular-mocks.js',
          'bower_components/ngtouch/src/ngTouch.js',
          'bower_components/ng-idle/angular-idle.js',
          'bower_components/string.startsWith/src/string.startsWith.js'
        ],
        dest: 'www/lib/angular-components.js'
      },
      js: {
        src: [
          'src/js/app.js',
          'src/js/routes.js',
          'src/js/directives/*.js',
          'src/js/filters/*.js',
          'src/js/models/*.js',
          'src/js/services/*.js',
          'src/js/controllers/**/*.js',
          'src/js/translations.js',
          'src/js/appConfig.js',
          'src/js/init.js',
          'node_modules/bezier-easing/dist/bezier-easing.min.js',
          'node_modules/cordova-plugin-qrscanner/dist/cordova-plugin-qrscanner-lib.min.js'
        ],
        dest: 'www/js/app.js'
      }
    },
    uglify: {
      options: {
        mangle: false
      },
      prod: {
        files: {
          'www/js/app.js': ['www/js/app.js'],
          'www/lib/angular-components.js': ['www/lib/angular-components.js']
        }
      }
    },
    nggettext_extract: {
      pot: {
        files: {
          'i18n/po/template.pot': [
            'www/index.html',
            'www/views/**/*.html',
            'src/js/routes.js',
            'src/js/services/*.js',
            'src/js/controllers/**/*.js'
          ]
        }
      }
    },
    nggettext_compile: {
      all: {
        options: {
          module: 'canoeApp'
        },
        files: {
          'src/js/translations.js': ['i18n/po/*.po']
        }
      }
    },
    copy: {
      ionic_fonts: {
        expand: true,
        flatten: true,
        src: 'bower_components/ionic/release/fonts/ionicons.*',
        dest: 'www/fonts/'
      },
      ionic_js: {
        expand: true,
        flatten: true,
        src: 'bower_components/ionic/release/js/ionic.bundle.min.js',
        dest: 'www/lib/'
      },
      linux: {
        files: [{
          expand: true,
          cwd: 'build/',
          src: ['../resources/canoe/linux/canoe.desktop', '../www/img/bcb.ico', '../resources/canoe/linux/canoe.png'],
          dest: 'build/canoe/linux64/',
          flatten: true,
          filter: 'isFile'
        }]
      },
      linux_native: {
        files: [{
          expand: true,
          cwd: 'native/linux64/',
          src: ['**'],
          dest: 'build/canoe/linux64/'
        }]
      },
      osx_native: {
        files: [{
          expand: true,
          cwd: 'native/osx64/',
          src: ['**'],
          dest: 'build/canoe/osx64/canoe.app/Contents/Resources/app.nw/'
        }]
      }
    },
    nwjs: {
      options: {
        platforms: ['osx64', 'linux64', 'win64', 'win32'],
        flavor: 'sdk', // normal or sdk
        zip: false,
        version: '0.36.4', // If you modify you need to rebuild native modules! "grunt exec:powbuild" and copy raiblocks-pow into native dir
        macIcns: './icon.icns',
        exeIco: './icon.ico',
        macPlist: {
          'CFBundleURLTypes': [
            {
              'CFBundleURLName': 'URI Handler',
              'CFBundleURLSchemes': ['bcb', 'canoe']
            }
          ]
        }
      },
      src: ['./package.json', './www/**/*']
    },
    browserify: {
      dist: {
        files: {
          'www/raiwallet/braiwallet.js': ['src/js/raiwallet.js']
        }
      }
    },
    appdmg: {
      options: {
        basepath: '.',
        title: 'Canoe <%= pkg.version %>',
        icon: 'resources/canoe/mac/volume-icon.icns',
        background: 'resources/canoe/mac/dmg-background.tiff', // png?
        contents: [
          {x: 378, y: 154, type: 'link', path: '/Applications'},
          {x: 122, y: 154, type: 'file', path: 'build/canoe/canoe-osx64-<%= pkg.version %>/canoe.app'}
         // NOT USED: {x: 412, y: 128, type: 'file', path: 'README.txt'}
        ]
      },
      target: {
        dest: 'build/canoe-osx64-<%= pkg.version %>.dmg'
      }
    }
  })

  grunt.registerTask('default', ['nggettext_compile', 'exec:appConfig', 'browserify', 'sass', 'concat', 'copy:ionic_fonts', 'copy:ionic_js'])
  grunt.registerTask('prod', ['default', 'uglify'])
  grunt.registerTask('translate', ['nggettext_extract'])
  grunt.registerTask('desktop', ['prod', 'exec:cleanbuild', 'nwjs', 'exec:desktopLinux', 'copy:linux', 'copy:linux_native', 'copy:osx_native', 'exec:ziplinux', 'exec:appimage', 'exec:ziposx', 'exec:zipwin', 'exec:zipwin32'])
  grunt.registerTask('desktoplinux64', ['prod', 'exec:cleanbuild', 'nwjs', 'exec:desktopLinux', 'copy:linux', 'copy:linux_native', 'exec:ziplinux'])
  grunt.registerTask('desktoposx64', ['prod', 'exec:cleanbuild', 'nwjs', 'copy:osx_native', 'exec:ziposx', 'appdmg'])
  grunt.registerTask('desktopwin64', ['prod', 'exec:cleanbuild', 'nwjs', 'exec:zipwin'])
  grunt.registerTask('desktopwin32', ['prod', 'exec:cleanbuild', 'nwjs', 'exec:zipwin32'])
  grunt.registerTask('osx', ['prod', 'nwjs', 'copy:osx_native', 'appdmg', 'exec:osxsign'])
  grunt.registerTask('osx-debug', ['default', 'nwjs'])
  grunt.registerTask('chrome', ['default', 'exec:chrome'])
  grunt.registerTask('wp', ['prod', 'exec:wp'])
  grunt.registerTask('wp-copy', ['default', 'exec:wpcopy'])
  grunt.registerTask('wp-init', ['default', 'exec:wpinit'])
  grunt.registerTask('ios', ['exec:ios'])
  grunt.registerTask('ios-debug', ['exec:iosdebug'])
  grunt.registerTask('ios-run', ['exec:xcode'])
  grunt.registerTask('cordovaclean', ['exec:cordovaclean'])
  grunt.registerTask('android-debug', ['exec:androiddebug', 'exec:androidrun'])
  grunt.registerTask('android', ['exec:android'])
  grunt.registerTask('desktopsign', ['exec:desktopsign', 'exec:desktopverify'])
}
