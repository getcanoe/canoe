'use strict'
/* global angular */
angular.module('canoeApp.services')
  .factory('uxLanguage', function languageService ($log, lodash, gettextCatalog, amMoment, configService) {
    var root = {}

    root.currentLanguage = null

    // See https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
    root.availableLanguages = [{
      name: 'العربية',
      isoCode: 'ar' // Arabic
    }, {
      name: 'български език',
      isoCode: 'bg' // Bulgarian
    }, {
      name: 'Čeština',
      isoCode: 'cs' // Czech
    }, {
      name: 'Dansk',
      isoCode: 'da' // Danish
    }, {
      name: 'Deutsch',
      isoCode: 'de' // German
    }, {
      name: 'English',
      isoCode: 'en' // English
    }, {
      name: 'Español',
      isoCode: 'es' // Spanish
    }, {
      name: 'Eesti keelt',
      isoCode: 'et' // Estonian
    }, {
      name: 'Français',
      isoCode: 'fr' // French
    }, {
      name: 'עברית',
      isoCode: 'he' // Hebrew
    }, {
      name: 'Hrvatski jezik',
      isoCode: 'hr' // Croatian
    }, {
      name: 'Italiano',
      isoCode: 'it' // Italian
    }, {
      name: 'Magyar',
      isoCode: 'hu' // Hungarian
    }, {
      name: 'Nederlands',
      isoCode: 'nl' // Dutch
    }, {
      name: 'Norsk Bokmål',
      isoCode: 'nb' // Norwegian Bokmål
    }, {
      name: 'Polski',
      isoCode: 'pl' // Polish
    }, {
      name: 'Português',
      isoCode: 'pt' // Portuguese
    }, {
      name: 'Português (Brazil)',
      isoCode: 'pt-br' // Portuguese Brazil
    }, {
      name: 'Română',
      isoCode: 'ro' // Romanian
    }, {
      name: '日本語',
      isoCode: 'ja', // Japanese
      useIdeograms: true
    }, {
      name: '中文（简体）',
      isoCode: 'zh', // Chinese Simplified
      useIdeograms: true
    }, {
      name: 'Pусский',
      isoCode: 'ru' // Russian
    }, {
      name: 'Slovenčina',
      isoCode: 'sk' // Slovak
    }, {
      name: 'Svenska',
      isoCode: 'sv' // Swedish
    }, {
      name: 'Tiếng Việt',
      isoCode: 'vi' // Vietnamese
    }]

    root._detect = function (cb) {
      var userLang
      if (navigator && navigator.globalization) {
        navigator.globalization.getPreferredLanguage(function (preferedLanguage) {
          // works for iOS and Android 4.x
          userLang = preferedLanguage.value
          userLang = userLang ? (userLang.split('-', 1)[0] || 'en') : 'en'
          // Set only available languages
          userLang = root.isAvailableLanguage(userLang)
          return cb(userLang)
        })
      } else {
        // Auto-detect browser language
        userLang = navigator.userLanguage || navigator.language
        userLang = userLang ? (userLang.split('-', 1)[0] || 'en') : 'en'
        // Set only available languages
        userLang = root.isAvailableLanguage(userLang)
        return cb(userLang)
      }
    }

    root.isAvailableLanguage = function (userLang) {
      return lodash.find(root.availableLanguages, {
        'isoCode': userLang
      }) ? userLang : 'en'
    }

    root._set = function (lang) {
      $log.debug('Setting default language: ' + lang)
      gettextCatalog.setCurrentLanguage(lang)
      root.currentLanguage = lang

      if (lang === 'zh') lang = lang + '-CN' // Fix for Chinese Simplified
      amMoment.changeLocale(lang)
    }

    root.getCurrentLanguage = function () {
      return root.currentLanguage
    }

    root.getCurrentLanguageName = function () {
      return root.getName(root.currentLanguage)
    }

    root.getCurrentLanguageInfo = function () {
      return lodash.find(root.availableLanguages, {
        'isoCode': root.currentLanguage
      })
    }

    root.getLanguages = function () {
      return root.availableLanguages
    }

    root.init = function (cb) {
      configService.whenAvailable(function (config) {
        var userLang = config.wallet.settings.defaultLanguage
        if (userLang && userLang !== root.currentLanguage) {
          root._set(userLang)
        } else {
          root._detect(function (lang) {
            root._set(lang)
          })
        }
        if (cb) return cb()
      })
    }

    root.getName = function (lang) {
      return lodash.result(lodash.find(root.availableLanguages, {
        'isoCode': lang
      }), 'name')
    }

    return root
  })
