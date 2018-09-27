'use strict'
/* global angular */
angular.module('canoeApp.services').factory('configService', function ($http, storageService, lodash, $log, $timeout, $rootScope, platformInfo) {
  var root = {}
  root.http = $http

  var isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP

  var defaultConfig = {
    download: {
      canoe: {
        url: 'https://getcanoe.io'
      }
    },

    backend: 'getcanoe.io',

    rateApp: {
      canoe: {
        ios: 'https://itunes.apple.com/us/app/canoe-nano-wallet/id1365127213?mt=8',
        android: 'https://play.google.com/store/apps/details?id=io.getcanoe.canoe',
        wp: ''
      }
    },
    // Wallet default config
    wallet: {
      timeoutSoft: 30,
      timeoutHard: 60,
      lockTypeSoft: 'none', // PIN is not yet configured and fingerprint may not be available
      lockTypeBackground: 'none', // PIN is not yet configured and fingerprint may not be available
      serverSidePoW: (!platformInfo.isLinux), // On NW Linux we now have good client side PoW
      playSounds: true,
      settings: {
        unitName: 'NANO',
        unitToRaw: Math.pow(10, 30),
        unitDecimals: 2,
        unitCode: 'NANO',
        alternativeName: 'US Dollar',
        alternativeIsoCode: undefined,
        amountInputDefaultCurrency: 'NANO'
      }
    },

    lock: {
      value: '0000', // If people enable PIN and haven't set it yet
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
  var country_code_to_currency = {'AF': ['AFN', 'Afghan Afghani'],
    'AX': ['EUR', 'Eurozone Euro'],
    'AL': ['ALL', 'Albanian Lek'],
    'DZ': ['DZD', 'Algerian Dinar'],
    'AS': ['USD', 'US Dollar'],
    'AD': ['EUR', 'Eurozone Euro'],
    'AO': ['AOA', 'Angolan Kwanza'],
    'AI': ['XCD', 'East Caribbean Dollar'],
    'AG': ['XCD', 'East Caribbean Dollar'],
    'AR': ['ARS', 'Argentine Peso'], //
    'AM': ['AMD', 'Armenian Dram'],
    'AW': ['AWG', 'Aruban Florin'],
    'AU': ['AUD', 'Australian Dollar'],
    'AT': ['EUR', 'Eurozone Euro'],
    'AZ': ['AZN', 'Azerbaijani Manat'],
    'BS': ['BSD', 'Bahamian Dollar'],
    'BH': ['BHD', 'Bahraini Dinar'],
    'BD': ['BDT', 'Bangladeshi Taka'],
    'BB': ['BBD', 'Barbadian Dollar'],
    'BY': ['BYR', 'BYR'], //
    'BE': ['EUR', 'Eurozone Euro'],
    'BZ': ['BZD', 'Belize Dollar'],
    'BJ': ['XOF', 'CFA Franc BCEAO'],
    'BM': ['BMD', 'Bermudan Dollar'],
    'BT': ['BTN', 'Bhutanese Ngultrum'],
    'BO': ['BOB', 'Bolivian Boliviano'],
    'BQ': ['USD', 'US Dollar'],
    'BA': ['BAM', 'Bosnia-Herzegovina Convertible Mark'],
    'BW': ['BWP', 'Botswanan Pula'], //
    'BV': ['NOK', 'Norwegian Krone'],
    'BR': ['BRL', 'Brazilian Real'],
    'IO': ['GBP', 'Pound Sterling'],
    'BN': ['BND', 'Brunei Dollar'],
    'BG': ['BGN', 'Bulgarian Lev'],
    'BF': ['XOF', 'CFA Franc BCEAO'],
    'BI': ['BIF', 'Burundian Franc'],
    'KH': ['KHR', 'Cambodian Riel'],
    'CM': ['XAF', 'CFA Franc BEAC'],
    'CA': ['CAD', 'Canadian Dollar'], //
    'CV': ['CVE', 'Cape Verdean Escudo'],
    'KY': ['KYD', 'Cayman Islands Dollar'],
    'CF': ['XAF', 'CFA Franc BEAC'],
    'TD': ['XAF', 'CFA Franc BEAC'],
    'CL': ['CLF', 'Chilean Unit of Account (UF)'],
    'CN': ['CNY', 'Chinese Yuan'],
    'CX': ['AUD', 'Australian Dollar'],
    'CC': ['AUD', 'Australian Dollar'],
    'CO': ['COP', 'Colombian Peso'], //
    'KM': ['KMF', 'Comorian Franc'],
    'CG': ['XAF', 'CFA Franc BEAC'],
    'CD': ['CDF', 'Congolese Franc'],
    'CK': ['NZD', 'New Zealand Dollar'],
    'CR': ['CRC', 'Costa Rican Colón'],
    'CI': ['XOF', 'CFA Franc BCEAO'],
    'HR': ['HRK', 'Croatian Kuna'],
    'CU': ['CUC', 'CUC'],
    'CW': ['ANG', 'Netherlands Antillean Guilder'],
    'CY': ['EUR', 'Eurozone Euro'], //
    'CZ': ['CZK', 'Czech Koruna'],
    'DK': ['DKK', 'Danish Krone'],
    'DJ': ['DJF', 'Djiboutian Franc'],
    'DM': ['XCD', 'East Caribbean Dollar'],
    'DO': ['DOP', 'Dominican Peso'],
    'EC': ['USD', 'US Dollar'],
    'EG': ['EGP', 'Egyptian Pound'],
    'SV': ['USD', 'US Dollar'],
    'GQ': ['XAF', 'CFA Franc BEAC'],
    'ER': ['ERN', 'ERN'],
    'EE': ['EUR', 'Eurozone Euro'], //
    'ET': ['ETB', 'Ethiopian Birr'],
    'FK': ['FKP', 'Falkland Islands Pound'],
    'FO': ['DKK', 'Danish Krone'],
    'FJ': ['FJD', 'Fijian Dollar'],
    'FI': ['EUR', 'Eurozone Euro'],
    'FR': ['EUR', 'Eurozone Euro'],
    'GF': ['EUR', 'Eurozone Euro'],
    'PF': ['XPF', 'CFP Franc'],
    'TF': ['EUR', 'Eurozone Euro'],
    'GA': ['XAF', 'CFA Franc BEAC'], //
    'GM': ['GMD', 'Gambian Dalasi'],
    'GE': ['GEL', 'Georgian Lari'],
    'DE': ['EUR', 'Eurozone Euro'],
    'GH': ['GHS', 'Ghanaian Cedi'],
    'GI': ['GIP', 'Gibraltar Pound'],
    'GR': ['EUR', 'Eurozone Euro'],
    'GL': ['DKK', 'Danish Krone'],
    'GD': ['XCD', 'East Caribbean Dollar'],
    'GP': ['EUR', 'Eurozone Euro'],
    'GU': ['USD', 'US Dollar'], //
    'GT': ['GTQ', 'Guatemalan Quetzal'],
    'GG': ['GBP', 'Pound Sterling'],
    'GN': ['GNF', 'Guinean Franc'],
    'GW': ['XOF', 'CFA Franc BCEAO'],
    'GY': ['GYD', 'Guyanaese Dollar'],
    'HT': ['HTG', 'Haitian Gourde'],
    'HM': ['AUD', 'Australian Dollar'],
    'VA': ['EUR', 'Eurozone Euro'],
    'HN': ['HNL', 'Honduran Lempira'],
    'HK': ['HKD', 'Hong Kong Dollar'], //
    'HU': ['HUF', 'Hungarian Forint'],
    'IS': ['ISK', 'Icelandic Króna'],
    'IN': ['INR', 'Indian Rupee'],
    'ID': ['IDR', 'Indonesian Rupiah'],
    'IR': ['IRR', 'Iranian Rial'],
    'IQ': ['IQD', 'Iraqi Dinar'],
    'IE': ['EUR', 'Eurozone Euro'],
    'IM': ['GBP', 'Pound Sterling'],
    'IL': ['ILS', 'Israeli Shekel'],
    'IT': ['EUR', 'Eurozone Euro'], //
    'JM': ['JMD', 'Jamaican Dollar'],
    'JP': ['JPY', 'Japanese Yen'],
    'JE': ['GBP', 'Pound Sterling'],
    'JO': ['JOD', 'Jordanian Dinar'],
    'KZ': ['KZT', 'Kazakhstani Tenge'],
    'KE': ['KES', 'Kenyan Shilling'],
    'KI': ['AUD', 'Australian Dollar'],
    'KP': ['KPW', 'North Korean Won'],
    'KR': ['KRW', 'South Korean Won'],
    'KW': ['KWD', 'Kuwaiti Dinar'], //
    'KG': ['KGS', 'Kyrgystani Som'],
    'LA': ['LAK', 'Laotian Kip'],
    'LV': ['LVL', 'LVL'],
    'LB': ['LBP', 'Lebanese Pound'],
    'LS': ['LSL', 'Lesotho Loti'],
    'LR': ['LRD', 'Liberian Dollar'],
    'LY': ['LYD', 'Libyan Dinar'],
    'LI': ['CHF', 'Swiss Franc'],
    'LT': ['LTL', 'LTL'],
    'LU': ['EUR', 'Eurozone Euro'],
    'MO': ['HKD', 'Hong Kong Dollar'], //
    'MK': ['MKD', 'Macedonian Denar'],
    'MG': ['MGA', 'Malagasy Ariary'],
    'MW': ['MWK', 'Malawian Kwacha'],
    'MY': ['MYR', 'Malaysian Ringgit'],
    'MV': ['MVR', 'Maldivian Rufiyaa'],
    'ML': ['XOF', 'CFA Franc BCEAO'],
    'MT': ['EUR', 'Eurozone Euro'],
    'MH': ['USD', 'US Dollar'],
    'MQ': ['EUR', 'Eurozone Euro'],
    'MR': ['MRO', 'MRO'], //
    'MU': ['MUR', 'Mauritian Rupee'],
    'YT': ['EUR', 'Eurozone Euro'],
    'MX': ['MXN', 'Mexican Peso'],
    'FM': ['USD', 'US Dollar'],
    'MD': ['MDL', 'Moldovan Leu'],
    'MC': ['EUR', 'Eurozone Euro'],
    'MN': ['MNT', 'Mongolian Tugrik'],
    'ME': ['EUR', 'Eurozone Euro'],
    'MS': ['XCD', 'East Caribbean Dollar'],
    'MA': ['MAD', 'Moroccan Dirham'], //
    'MZ': ['MZN', 'Mozambican Metical'],
    'MM': ['MMK', 'Myanma Kyat'],
    'NA': ['NAD', 'Namibian Dollar'],
    'NR': ['AUD', 'Australian Dollar'],
    'NP': ['NPR', 'Nepalese Rupee'],
    'NL': ['EUR', 'Eurozone Euro'],
    'NC': ['XPF', 'CFP Franc'],
    'NZ': ['NZD', 'New Zealand Dollar'],
    'NI': ['NIO', 'Nicaraguan Córdoba'],
    'NE': ['XOF', 'CFA Franc BCEAO'], //
    'NG': ['NGN', 'Nigerian Naira'],
    'NU': ['NZD', 'New Zealand Dollar'],
    'NF': ['AUD', 'Australian Dollar'],
    'MP': ['USD', 'US Dollar'],
    'NO': ['NOK', 'Norwegian Krone'],
    'OM': ['OMR', 'Omani Rial'],
    'PK': ['PKR', 'Pakistani Rupee'],
    'PW': ['USD', 'US Dollar'],
    'PS': ['EGP', 'Egyptian Pound'],
    'PA': ['PAB', 'Panamanian Balboa'], //
    'PG': ['PGK', 'Papua New Guinean Kina'],
    'PY': ['PYG', 'Paraguayan Guarani'],
    'PE': ['PEN', 'Peruvian Nuevo Sol'],
    'PH': ['PHP', 'Philippine Peso'],
    'PN': ['NZD', 'New Zealand Dollar'],
    'PL': ['PLN', 'Polish Zloty'],
    'PT': ['EUR', 'Eurozone Euro'],
    'PR': ['USD', 'US Dollar'],
    'QA': ['QAR', 'Qatari Rial'],
    'RE': ['EUR', 'Eurozone Euro'], //
    'RO': ['RON', 'Romanian Leu'],
    'RU': ['RUB', 'Russian Ruble'],
    'RW': ['RWF', 'Rwandan Franc'],
    'BL': ['EUR', 'Eurozone Euro'],
    'SH': ['SHP', 'Saint Helena Pound'],
    'KN': ['XCD', 'East Caribbean Dollar'],
    'LC': ['XCD', 'East Caribbean Dollar'],
    'MF': ['EUR', 'Eurozone Euro'],
    'PM': ['CAD', 'Canadian Dollar'],
    'VC': ['XCD', 'East Caribbean Dollar'], //
    'WS': ['WST', 'Samoan Tala'],
    'SM': ['EUR', 'Eurozone Euro'],
    'ST': ['STD', 'STD'],
    'SA': ['SAR', 'Saudi Riyal'],
    'SN': ['XOF', 'CFA Franc BCEAO'],
    'RS': ['RSD', 'Serbian Dinar'],
    'SC': ['SCR', 'Seychellois Rupee'],
    'SL': ['SLL', 'Sierra Leonean Leone'],
    'SG': ['BND', 'Brunei Dollar'],
    'SX': ['ANG', 'Netherlands Antillean Guilder'], //
    'SK': ['EUR', 'Eurozone Euro'],
    'SI': ['EUR', 'Eurozone Euro'],
    'SB': ['SBD', 'Solomon Islands Dollar'],
    'SO': ['SOS', 'Somali Shilling'],
    'ZA': ['ZAR', 'South African Rand'],
    'GS': ['GBP', 'Pound Sterling'],
    'SS': ['SSP', 'SSP'],
    'ES': ['EUR', 'Eurozone Euro'],
    'LK': ['LKR', 'Sri Lankan Rupee'],
    'SD': ['SDG', 'Sudanese Pound'], //
    'SR': ['SRD', 'Surinamese Dollar'],
    'SJ': ['NOK', 'Norwegian Krone'],
    'SZ': ['SZL', 'Swazi Lilangeni'],
    'SE': ['SEK', 'Swedish Krona'],
    'CH': ['CHF', 'Swiss Franc'],
    'SY': ['SYP', 'Syrian Pound'],
    'TW': ['TWD', 'New Taiwan Dollar'],
    'TJ': ['TJS', 'Tajikistani Somoni'],
    'TZ': ['TZS', 'Tanzanian Shilling'],
    'TH': ['THB', 'Thai Baht'], //
    'TL': ['USD', 'US Dollar'],
    'TG': ['XOF', 'CFA Franc BCEAO'],
    'TK': ['NZD', 'New Zealand Dollar'],
    'TO': ['TOP', 'Tongan Paʻanga'],
    'TT': ['TTD', 'Trinidad and Tobago Dollar'],
    'TN': ['TND', 'Tunisian Dinar'],
    'TR': ['TRY', 'Turkish Lira'],
    'TM': ['TMT', 'Turkmenistani Manat'],
    'TC': ['USD', 'US Dollar'],
    'TV': ['AUD', 'Australian Dollar'], //
    'UG': ['UGX', 'Ugandan Shilling'],
    'UA': ['UAH', 'Ukrainian Hryvnia'],
    'AE': ['AED', 'UAE Dirham'],
    'GB': ['GBP', 'Pound Sterling'],
    'US': ['USD', 'US Dollar'],
    'UM': ['USD', 'US Dollar'],
    'UY': ['UYI', 'UYI'],
    'UZ': ['UZS', 'Uzbekistan Som'],
    'VU': ['VUV', 'Vanuatu Vatu'],
    'VE': ['VEF', 'Venezuelan Bolívar Fuerte'], //
    'VN': ['VND', 'Vietnamese Dong'],
    'VG': ['USD', 'US Dollar'],
    'VI': ['USD', 'US Dollar'],
    'WF': ['XPF', 'CFP Franc'],
    'EH': ['MAD', 'Moroccan Dirham'],
    'YE': ['YER', 'Yemeni Rial'],
    'ZM': ['ZMW', 'Zambian Kwacha'],
    'ZW': ['USD', 'US Dollar']}

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
        var debug = true
        if (debug) $log.info('configCache.wallet.settings.alternativeIsoCode = ' + configCache.wallet.settings.alternativeIsoCode)
        // Do like when Onbording, with not alternative currency set
        // configCache.wallet.settings.alternativeIsoCode = undefined
        // console.log('Pretending there is no alternativeIsoCode in wallet = ' + configCache.wallet.settings.alternativeIsoCode)
        if (!configCache.wallet.settings.alternativeIsoCode) {
          configCache.wallet.settings.alternativeIsoCode = 'USD'
          // We don't have an alternative currency set in the wallet, so let's try to guess it
          // Let's get country code first, then currency
          if (root.http) {
            root.http.get('//freegeoip.net/json/').success(function (data, status) {
              // Test here :
              // response.country_code = 'XX'; // Any wrong or unknown currency
              // response.country_code = 'MM'; // 'MM' Myanmar
              // response.country_code = 'VE'; // Venezuela
              // response.country_code = 'KP'; // North Corea

              // response.country_code = 'FR'; // France -> EUR works fine
              // response.country_code = 'GB'; // UK is ok too
              // response.country_code = 'CA'; // Canada's fine, as always
              // response.country_code = 'BR'; // Brazil is ok too, so let's go to carnaval !
              if (debug) $log.info('data', data)
              if (debug) $log.info('data.country_code = ' + data.country_code)
              configCache.wallet.settings.alternativeIsoCode = country_code_to_currency[data.country_code][0]
              configCache.wallet.settings.alternativeName = country_code_to_currency[data.country_code][1]
              if (debug) $log.info('guessed currency = ' + configCache.wallet.settings.alternativeIsoCode)
              if (!configCache.wallet.settings.alternativeIsoCode) {
                configCache.wallet.settings.alternativeIsoCode = 'USD'
              }
              if (debug) $log.info('So finally configCache.wallet.settings.alternativeIsoCode = ' + configCache.wallet.settings.alternativeIsoCode)
            })
          }
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
