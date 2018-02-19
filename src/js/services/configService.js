'use strict'
/* global angular */
angular.module('canoeApp.services').factory('configService', function (storageService, lodash, $log, $timeout, $rootScope, platformInfo) {
  var root = {}

  var isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP

  var defaultConfig = {
    download: {
      canoe: {
        url: 'https://getcanoe.io'
      }
    },

    // TODO We need URL for rating iOS app, and Android
    rateApp: {
      canoe: {
        ios: '<URLNEEDED>',
        android: 'https://play.google.com/store/apps/details?id=io.getcanoe.canoe',
        wp: ''
      }
    },
    // wallet default config
    wallet: {
      serverSidePoW: true,
      settings: {
        unitName: 'NANO',
        unitToRaw: Math.pow(10, 30),
        unitDecimals: 2,
        unitCode: 'NANO',
        alternativeName: 'US Dollar',
        alternativeIsoCode: undefined,
        amountInputDefaultCurrency : 'NANO'
      }
    },

    lock: {
      method: 'password',
      value: null,
      bannedUntil: null
    },

    recentTransactions: {
      enabled: true
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
  
  // Contry code to curency map, hacked from https://github.com/michaelrhodes/currency-code-map
  var country_code_to_currency = {'AF': 'AFN', 'AX': 'EUR', 'AL': 'ALL', 'DZ': 'DZD', 'AS': 'USD', 'AD': 'EUR', 'AO': 'AOA', 'AI': 'XCD', 'AG': 'XCD', 'AR': 'ARS', 'AM': 'AMD', 'AW': 'AWG', 'AU': 'AUD', 'AT': 'EUR',
'AZ': 'AZN', 'BS': 'BSD', 'BH': 'BHD', 'BD': 'BDT', 'BB': 'BBD', 'BY': 'BYR', 'BE': 'EUR', 'BZ': 'BZD', 'BJ': 'XOF', 'BM': 'BMD', 'BT': 'BTN', 'BO': 'BOB', 'BQ': 'USD', 'BA': 'BAM', 
'BW': 'BWP', 'BV': 'NOK', 'BR': 'BRL', 'IO': 'GBP', 'BN': 'BND', 'BG': 'BGN', 'BF': 'XOF', 'BI': 'BIF', 'KH': 'KHR', 'CM': 'XAF', 'CA': 'CAD', 'CV': 'CVE', 'KY': 'KYD', 'CF': 'XAF',
 'TD': 'XAF', 'CL': 'CLF', 'CN': 'CNY', 'CX': 'AUD', 'CC': 'AUD', 'CO': 'COP', 'KM': 'KMF', 'CG': 'XAF', 'CD': 'CDF', 'CK': 'NZD', 'CR': 'CRC', 'CI': 'XOF', 'HR': 'HRK', 'CU': 'CUC',
 'CW': 'ANG', 'CY': 'EUR', 'CZ': 'CZK', 'DK': 'DKK', 'DJ': 'DJF', 'DM': 'XCD', 'DO': 'DOP', 'EC': 'USD', 'EG': 'EGP', 'SV': 'USD', 'GQ': 'XAF', 'ER': 'ERN', 'EE': 'EUR', 'ET': 'ETB',
 'FK': 'FKP', 'FO': 'DKK', 'FJ': 'FJD', 'FI': 'EUR', 'FR': 'EUR', 'GF': 'EUR', 'PF': 'XPF', 'TF': 'EUR', 'GA': 'XAF', 'GM': 'GMD', 'GE': 'GEL', 'DE': 'EUR', 'GH': 'GHS', 'GI': 'GIP', 
 'GR': 'EUR', 'GL': 'DKK', 'GD': 'XCD', 'GP': 'EUR', 'GU': 'USD', 'GT': 'GTQ', 'GG': 'GBP', 'GN': 'GNF', 'GW': 'XOF', 'GY': 'GYD', 'HT': 'HTG', 'HM': 'AUD', 'VA': 'EUR', 'HN': 'HNL',
 'HK': 'HKD', 'HU': 'HUF', 'IS': 'ISK', 'IN': 'INR', 'ID': 'IDR', 'IR': 'IRR', 'IQ': 'IQD', 'IE': 'EUR', 'IM': 'GBP', 'IL': 'ILS', 'IT': 'EUR', 'JM': 'JMD', 'JP': 'JPY', 'JE': 'GBP', 
 'JO': 'JOD', 'KZ': 'KZT', 'KE': 'KES', 'KI': 'AUD', 'KP': 'KPW', 'KR': 'KRW', 'KW': 'KWD', 'KG': 'KGS', 'LA': 'LAK', 'LV': 'LVL', 'LB': 'LBP', 'LS': 'LSL', 'LR': 'LRD', 'LY': 'LYD',
 'LI': 'CHF', 'LT': 'LTL', 'LU': 'EUR', 'MO': 'HKD', 'MK': 'MKD', 'MG': 'MGA', 'MW': 'MWK', 'MY': 'MYR', 'MV': 'MVR', 'ML': 'XOF', 'MT': 'EUR', 'MH': 'USD', 'MQ': 'EUR', 'MR': 'MRO',
 'MU': 'MUR', 'YT': 'EUR', 'MX': 'MXN', 'FM': 'USD', 'MD': 'MDL', 'MC': 'EUR', 'MN': 'MNT', 'ME': 'EUR', 'MS': 'XCD', 'MA': 'MAD', 'MZ': 'MZN', 'MM': 'MMK', 'NA': 'NAD', 'NR': 'AUD', 
 'NP': 'NPR', 'NL': 'EUR', 'NC': 'XPF', 'NZ': 'NZD', 'NI': 'NIO', 'NE': 'XOF', 'NG': 'NGN', 'NU': 'NZD', 'NF': 'AUD', 'MP': 'USD', 'NO': 'NOK', 'OM': 'OMR', 'PK': 'PKR', 'PW': 'USD',
 'PS': 'EGP', 'PA': 'PAB', 'PG': 'PGK', 'PY': 'PYG', 'PE': 'PEN', 'PH': 'PHP', 'PN': 'NZD', 'PL': 'PLN', 'PT': 'EUR', 'PR': 'USD', 'QA': 'QAR', 'RE': 'EUR', 'RO': 'RON', 'RU': 'RUB', 
 'RW': 'RWF', 'BL': 'EUR', 'SH': 'SHP', 'KN': 'XCD', 'LC': 'XCD', 'MF': 'EUR', 'PM': 'CAD', 'VC': 'XCD', 'WS': 'WST', 'SM': 'EUR', 'ST': 'STD', 'SA': 'SAR', 'SN': 'XOF', 'RS': 'RSD',
 'SC': 'SCR', 'SL': 'SLL', 'SG': 'BND', 'SX': 'ANG', 'SK': 'EUR', 'SI': 'EUR', 'SB': 'SBD', 'SO': 'SOS', 'ZA': 'ZAR', 'GS': 'GBP', 'SS': 'SSP', 'ES': 'EUR', 'LK': 'LKR', 'SD': 'SDG',
 'SR': 'SRD', 'SJ': 'NOK', 'SZ': 'SZL', 'SE': 'SEK', 'CH': 'CHF', 'SY': 'SYP', 'TW': 'TWD', 'TJ': 'TJS', 'TZ': 'TZS', 'TH': 'THB', 'TL': 'USD', 'TG': 'XOF', 'TK': 'NZD', 'TO': 'TOP', 
 'TT': 'TTD', 'TN': 'TND', 'TR': 'TRY', 'TM': 'TMT', 'TC': 'USD', 'TV': 'AUD', 'UG': 'UGX', 'UA': 'UAH', 'AE': 'AED', 'GB': 'GBP', 'US': 'USD', 'UM': 'USD', 'UY': 'UYI', 'UZ': 'UZS',
 'VU': 'VUV', 'VE': 'VEF', 'VN': 'VND', 'VG': 'USD', 'VI': 'USD', 'WF': 'XPF', 'EH': 'MAD', 'YE': 'YER', 'ZM': 'ZMW', 'ZW': 'USD' }

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

      // Alternative currency guessing
      if (configCache.wallet) {
        var debug = false;
        if (debug) console.log('configCache.wallet.settings.alternativeIsoCode = ' + configCache.wallet.settings.alternativeIsoCode)
        //if (!configCache.wallet.settings.alternativeIsoCode){ // Do like when Onbording, with not alternative currency set
        //  console.log('Pretending there is no alternativeIsoCode in wallet = ' + configCache.wallet.settings.alternativeIsoCode)
        //  configCache.wallet.settings.alternativeIsoCode = undefined
        //}
        if (!configCache.wallet.settings.alternativeIsoCode){
          // We don't have an alternative currency set in the wallet, so let's try to guess it
          // Let's get country code first, then currency
          $.getJSON('//freegeoip.net/json/?callback=?', function(response) {
            // Test here :
            // response.country_code = 'XX'; // Any wrong or unknown currency
            // response.country_code = 'MM'; // 'MM' Myanmar does not work well
            // response.country_code = 'VE'; // Venezuela either
            // response.country_code = 'KP'; // North Corea...

            // response.country_code = 'FR'; // France -> EUR works fine
            // response.country_code = 'GB'; // UK is ok too
            // response.country_code = 'CA'; // Canada's fine, as always
            // response.country_code = 'BR'; // Brazil is ok too, so let's go to carnaval !
            if (debug) $log.info('response.country_code = ' + response.country_code)
            configCache.wallet.settings.alternativeIsoCode = country_code_to_currency[response.country_code]
            if (debug) $log.info('guessed currency = ' + configCache.wallet.settings.alternativeIsoCode)
            if (!configCache.wallet.settings.alternativeIsoCode){
              configCache.wallet.settings.alternativeIsoCode = 'USD'
            }
            if (debug) $log.info('So finally configCache.wallet.settings.alternativeIsoCode = ' + configCache.wallet.settings.alternativeIsoCode)
          })
        }
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
