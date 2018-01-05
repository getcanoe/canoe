'use strict'

angular.module('canoeApp.services').factory('configService', function (storageService, lodash, $log, $timeout, $rootScope, platformInfo) {
  var root = {}

  var isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP

  var defaultConfig = {
    download: {
      canoe: {
        url: 'https://getcanoe.io/download'
      }
    },

    rateApp: {
      canoe: {
        ios: 'http://itunes.apple.com/WebObjects/MZStore.woa/wa/viewContentsUserReviews?id=951330296&pageNumber=0&sortOrdering=2&type=Purple+Software&mt=8',
        android: 'https://play.google.com/store/apps/details?id=io.getcanoe.canoe',
        wp: ''
      }
    },
    // wallet default config
    wallet: {
      reconnectDelay: 5000,
      idleDurationMin: 4,
      settings: {
        unitName: 'XRB',
        unitToRaw: Math.pow(10, 30),
        unitDecimals: 2,
        unitCode: 'xrb',
        alternativeName: 'US Dollar',
        alternativeIsoCode: 'USD'
      }
    },

    lock: {
      method: null,
      value: null,
      bannedUntil: null
    },

    recentTransactions: {
      enabled: true
    },

    hideNextSteps: {
      enabled: !!isWindowsPhoneApp
    },

    rates: {
      url: 'https://insight.bitpay.com:443/api/rates'
    },

    release: {
      url: 'https://api.github.com/repos/getcanoe/canoe/releases/latest'
    },

    pushNotificationsEnabled: true,

    confirmedTxsNotifications: {
      enabled: true
    },

    emailNotifications: {
      enabled: false
    },

    log: {
      filter: 'debug'
    }
  }

  var configCache = null

  root.getSync = function () {
    if (!configCache) { throw new Error('configService#getSync called when cache is not initialized') }

    return configCache
  }

  root._queue = []
  root.whenAvailable = function (cb) {
    if (!configCache) {
      root._queue.push(cb)
      return
    }
    return cb(configCache)
  }

  root.get = function (cb) {
    storageService.getConfig(function (err, localConfig) {
      if (localConfig) {
        configCache = JSON.parse(localConfig)
      } else {
        configCache = lodash.clone(defaultConfig)
      }

      configCache.bwsFor = configCache.bwsFor || {}
      configCache.colorFor = configCache.colorFor || {}
      configCache.aliasFor = configCache.aliasFor || {}
      configCache.emailFor = configCache.emailFor || {}

      $log.debug('Preferences read:', configCache)

      lodash.each(root._queue, function (x) {
        $timeout(function () {
          return x(configCache)
        }, 1)
      })
      root._queue = []

      return cb(err, configCache)
    })
  }

  root.set = function (newOpts, cb) {
    var config = lodash.cloneDeep(defaultConfig)
    storageService.getConfig(function (err, oldOpts) {
      oldOpts = oldOpts || {}

      if (lodash.isString(oldOpts)) {
        oldOpts = JSON.parse(oldOpts)
      }
      if (lodash.isString(config)) {
        config = JSON.parse(config)
      }
      if (lodash.isString(newOpts)) {
        newOpts = JSON.parse(newOpts)
      }

      lodash.merge(config, oldOpts, newOpts)
      configCache = config

      $rootScope.$emit('Local/SettingsUpdated')

      storageService.storeConfig(JSON.stringify(config), cb)
    })
  }

  root.reset = function (cb) {
    configCache = lodash.clone(defaultConfig)
    storageService.removeConfig(cb)
  }

  root.getDefaults = function () {
    return lodash.clone(defaultConfig)
  }

  return root
})
