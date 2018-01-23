'use strict'
/* global screen cordova angular */

var unsupported, isaosp

if (window && window.navigator) {
  var rxaosp = window.navigator.userAgent.match(/Android.*AppleWebKit\/([\d.]+)/)
  isaosp = (rxaosp && rxaosp[1] < 537)
  if (!window.cordova && isaosp) { unsupported = true }
  if (unsupported) {
    window.location = '#/unsupported'
  }
}

// Setting up route
angular.module('canoeApp').config(function (historicLogProvider, $provide, $logProvider, $stateProvider, $urlRouterProvider, $compileProvider, $ionicConfigProvider) {
  $urlRouterProvider.otherwise('/starting')

    // NO CACHE
    // $ionicConfigProvider.views.maxCache(0);

    // TABS BOTTOM
  $ionicConfigProvider.tabs.position('bottom')

    // NAV TITTLE CENTERED
  $ionicConfigProvider.navBar.alignTitle('center')

    // NAV BUTTONS ALIGMENT
  $ionicConfigProvider.navBar.positionPrimaryButtons('left')
  $ionicConfigProvider.navBar.positionSecondaryButtons('right')

    // NAV BACK-BUTTON TEXT/ICON
  $ionicConfigProvider.backButton.icon('icon ion-ios-arrow-thin-left').text('')
  $ionicConfigProvider.backButton.previousTitleText(false)

    // CHECKBOX CIRCLE
  $ionicConfigProvider.form.checkbox('circle')

    // USE NATIVE SCROLLING
  $ionicConfigProvider.scrolling.jsScrolling(false)

  $logProvider.debugEnabled(true)
  $provide.decorator('$log', ['$delegate', 'platformInfo',
    function ($delegate, platformInfo) {
      var historicLog = historicLogProvider.$get()

      historicLog.getLevels().forEach(function (levelDesc) {
        var level = levelDesc.level
        if (platformInfo.isDevel && level === 'error') return

        var orig = $delegate[level]
        $delegate[level] = function () {
          if (level === 'error') { console.log(arguments) }

          var args = Array.prototype.slice.call(arguments)

          args = args.map(function (v) {
            try {
              if (typeof v === 'undefined') v = 'undefined'
              if (!v) v = 'null'
              if (typeof v === 'object') {
                if (v.message) { v = v.message } else { v = JSON.stringify(v) }
              }
              // Trim output in mobile
              if (platformInfo.isCordova) {
                v = v.toString()
                if (v.length > 3000) {
                  v = v.substr(0, 2997) + '...'
                }
              }
            } catch (e) {
              console.log('Error at log decorator:', e)
              v = 'undefined'
            }
            return v
          })

          try {
            if (platformInfo.isCordova) { console.log(args.join(' ')) }

            historicLog.add(level, args.join(' '))
            orig.apply(null, args)
          } catch (e) {
            console.log('ERROR (at log decorator):', e, args[0])
          }
        }
      })
      return $delegate
    }
  ])

    // whitelist 'chrome-extension:' for chromeApp to work with image URLs processed by Angular
    // link: http://stackoverflow.com/questions/15606751/angular-changes-urls-to-unsafe-in-extension-page?lq=1
  $compileProvider.imgSrcSanitizationWhitelist(/^\s*((https?|ftp|file|blob|chrome-extension):|data:image\/)/)

  $stateProvider

      /*
       *
       * Other pages
       *
       */

      .state('unsupported', {
        url: '/unsupported',
        templateUrl: 'views/unsupported.html'
      })

      .state('starting', {
        url: '/starting',
        template: '<ion-view id="starting"><ion-content><div class="block-spinner row"><ion-spinner class="spinner-stable" icon="crescent"></ion-spinner></div></ion-content></ion-view>'
      })

      /*
       *
       * URI
       *
       */

      .state('uri', {
        url: '/uri/:url',
        controller: function ($stateParams, $log, openURLService, profileService) {
          profileService.whenAvailable(function () {
            $log.info('DEEP LINK from Browser:' + $stateParams.url)
            openURLService.handleURL({
              url: $stateParams.url
            })
          })
        }
      })

      /*
       *
       * Wallet
       *
       */

      .state('tabs.account', {
        url: '/account/:accountId/:fromOnboarding/:clearCache',
        views: {
          'tab-home@tabs': {
            controller: 'accountDetailsController',
            templateUrl: 'views/accountDetails.html'
          }
        }
      })
      .state('tabs.activity', {
        url: '/activity',
        views: {
          'tab-home@tabs': {
            controller: 'activityController',
            templateUrl: 'views/activity.html'
          }
        }
      })
      .state('tabs.proposals', {
        url: '/proposals',
        views: {
          'tab-home@tabs': {
            controller: 'proposalsController',
            templateUrl: 'views/proposals.html'
          }
        }
      })
      .state('tabs.account.tx-details', {
        url: '/tx-details/:txid',
        views: {
          'tab-home@tabs': {
            controller: 'txDetailsController',
            templateUrl: 'views/tx-details.html'
          }
        }
      })
      .state('tabs.account.backupWarning', {
        url: '/backupWarning/:from/:walletId',
        views: {
          'tab-home@tabs': {
            controller: 'backupWarningController',
            templateUrl: 'views/backupWarning.html'
          }
        }
      })
      .state('tabs.account.backup', {
        url: '/backup/:walletId',
        views: {
          'tab-home@tabs': {
            templateUrl: 'views/backup.html',
            controller: 'backupController'
          }
        }
      })

      .state('tabs.account.addresses', {
        url: '/addresses/:walletId/:toAddress',
        views: {
          'tab-home@tabs': {
            controller: 'addressesController',
            templateUrl: 'views/addresses.html'
          }
        }
      })
      .state('tabs.account.allAddresses', {
        url: '/allAddresses/:walletId',
        views: {
          'tab-home@tabs': {
            controller: 'addressesController',
            templateUrl: 'views/allAddresses.html'
          }
        }
      })

      /*
       *
       * Tabs
       *
       */

      .state('tabs', {
        url: '/tabs',
        abstract: true,
        controller: 'tabsController',
        templateUrl: 'views/tabs.html'
      })
      .state('tabs.home', {
        url: '/home/:fromOnboarding',
        views: {
          'tab-home': {
            controller: 'tabHomeController',
            templateUrl: 'views/tab-home.html'
          }
        }
      })
      .state('tabs.receive', {
        url: '/receive',
        views: {
          'tab-receive': {
            controller: 'tabReceiveController',
            templateUrl: 'views/tab-receive.html'
          }
        }
      })
      .state('tabs.scan', {
        url: '/scan',
        views: {
          'tab-scan': {
            controller: 'tabScanController',
            templateUrl: 'views/tab-scan.html'
          }
        }
      })
      .state('scanner', {
        url: '/scanner',
        params: {
          passthroughMode: null
        },
        controller: 'tabScanController',
        templateUrl: 'views/tab-scan.html'
      })
      .state('tabs.send', {
        url: '/send',
        views: {
          'tab-send': {
            controller: 'tabSendController',
            templateUrl: 'views/tab-send.html'
          }
        }
      })
      .state('tabs.settings', {
        url: '/settings',
        views: {
          'tab-settings': {
            controller: 'tabSettingsController',
            templateUrl: 'views/tab-settings.html'
          }
        }
      })

      /*
       *
       * Send
       *
       */

      .state('tabs.send.amount', {
        url: '/amount/:recipientType/:toAddress/:toName/:toEmail/:toColor/:fixedUnit',
        views: {
          'tab-send@tabs': {
            controller: 'amountController',
            templateUrl: 'views/amount.html'
          }
        }
      })
      .state('tabs.send.confirm', {
        url: '/confirm/:recipientType/:toAddress/:toName/:toAmount/:toEmail/:toColor/:description/:coin/:useSendMax',
        views: {
          'tab-send@tabs': {
            controller: 'confirmController',
            templateUrl: 'views/confirm.html'
          }
        },
        params: {
          paypro: null
        }
      })
      .state('tabs.send.addressbook', {
        url: '/addressbook/add/:fromSendTab/:addressbookEntry',
        views: {
          'tab-send@tabs': {
            templateUrl: 'views/addressbook.add.html',
            controller: 'addressbookAddController'
          }
        }
      })

      /*
       *
       * Add
       *
       */

      .state('tabs.create-account', {
        url: '/create-account',
        views: {
          'tab-home@tabs': {
            templateUrl: 'views/tab-create-account.html',
            controller: 'createController'
          }
        }
      })

      /*
       *
       * Global Settings
       *
       */

      .state('tabs.notifications', {
        url: '/notifications',
        views: {
          'tab-settings@tabs': {
            controller: 'preferencesNotificationsController',
            templateUrl: 'views/preferencesNotifications.html'
          }
        }
      })
      .state('tabs.language', {
        url: '/language',
        views: {
          'tab-settings@tabs': {
            controller: 'preferencesLanguageController',
            templateUrl: 'views/preferencesLanguage.html'
          }
        }
      })
      .state('tabs.import', {
        url: '/import',
        views: {
          'tab-settings@tabs': {
            templateUrl: 'views/import.html',
            controller: 'importController'
          }
        }
      })
      .state('tabs.altCurrency', {
        url: '/altCurrency',
        views: {
          'tab-settings@tabs': {
            controller: 'preferencesAltCurrencyController',
            templateUrl: 'views/preferencesAltCurrency.html'
          }
        }
      })
      .state('tabs.about', {
        url: '/about',
        views: {
          'tab-settings@tabs': {
            controller: 'preferencesAbout',
            templateUrl: 'views/preferencesAbout.html'
          }
        }
      })
      .state('tabs.about.logs', {
        url: '/logs',
        views: {
          'tab-settings@tabs': {
            controller: 'preferencesLogs',
            templateUrl: 'views/preferencesLogs.html'
          }
        }
      })
      .state('tabs.about.termsOfUse', {
        url: '/termsOfUse',
        views: {
          'tab-settings@tabs': {
            templateUrl: 'views/termsOfUse.html'
          }
        }
      })
      .state('tabs.advanced', {
        url: '/advanced',
        views: {
          'tab-settings@tabs': {
            controller: 'advancedSettingsController',
            templateUrl: 'views/advancedSettings.html'
          }
        }
      })
      .state('tabs.preferencesSecurity', {
        url: '/preferencesSecurity',
        views: {
          'tab-settings@tabs': {
            controller: 'preferencesSecurityController',
            templateUrl: 'views/preferencesSecurity.html'
          }
        }
      })
      .state('tabs.preferencesSecurity.changePassword', {
        url: '/preferencesSecurity/changePassword',
        views: {
          'tab-settings@tabs': {
            controller: 'changePasswordController',
            templateUrl: 'views/changePassword.html'
          }
        }
      })
      .state('tabs.pin', {
        url: '/pin/:action',
        views: {
          'tab-settings@tabs': {
            controller: 'pinController',
            templateUrl: 'views/pin.html',
            cache: false
          }
        }
      })

      /*
       *
       * Wallet preferences
       *
       */

      .state('tabs.preferences', {
        url: '/preferences/:accountId',
        views: {
          'tab-settings@tabs': {
            controller: 'preferencesController',
            templateUrl: 'views/preferences.html'
          }
        }
      })
      .state('tabs.preferences.preferencesAlias', {
        url: '/preferencesAlias',
        views: {
          'tab-settings@tabs': {
            controller: 'preferencesAliasController',
            templateUrl: 'views/preferencesAlias.html'
          }
        }
      })
      .state('tabs.preferences.preferencesColor', {
        url: '/preferencesColor',
        views: {
          'tab-settings@tabs': {
            controller: 'preferencesColorController',
            templateUrl: 'views/preferencesColor.html'
          }
        }
      })
      .state('tabs.preferences.backupWarning', {
        url: '/backupWarning/:from',
        views: {
          'tab-settings@tabs': {
            controller: 'backupWarningController',
            templateUrl: 'views/backupWarning.html'
          }
        }
      })
      .state('tabs.preferences.backup', {
        url: '/backup',
        views: {
          'tab-settings@tabs': {
            controller: 'backupController',
            templateUrl: 'views/backup.html'
          }
        }
      })
      .state('tabs.preferences.preferencesAdvanced', {
        url: '/preferencesAdvanced',
        views: {
          'tab-settings@tabs': {
            controller: 'preferencesAdvancedController',
            templateUrl: 'views/preferencesAdvanced.html'
          }
        }
      })
      .state('tabs.preferences.export', {
        url: '/export',
        views: {
          'tab-settings@tabs': {
            controller: 'exportController',
            templateUrl: 'views/export.html'
          }
        }
      })
      .state('tabs.preferences.preferencesExternal', {
        url: '/preferencesExternal',
        views: {
          'tab-settings@tabs': {
            controller: 'preferencesExternalController',
            templateUrl: 'views/preferencesExternal.html'
          }
        }
      })
      .state('tabs.preferences.delete', {
        url: '/delete',
        views: {
          'tab-settings@tabs': {
            controller: 'preferencesDeleteWalletController',
            templateUrl: 'views/preferencesDeleteWallet.html'
          }
        }
      })

      /*
       *
       * Addressbook
       *
       */

      .state('tabs.addressbook', {
        url: '/addressbook',
        views: {
          'tab-settings@tabs': {
            templateUrl: 'views/addressbook.html',
            controller: 'addressbookListController'
          }
        }
      })
      .state('tabs.addressbook.add', {
        url: '/add',
        views: {
          'tab-settings@tabs': {
            templateUrl: 'views/addressbook.add.html',
            controller: 'addressbookAddController'
          }
        }
      })
      .state('tabs.addressbook.view', {
        url: '/view/:address/:email/:name',
        views: {
          'tab-settings@tabs': {
            templateUrl: 'views/addressbook.view.html',
            controller: 'addressbookViewController'
          }
        }
      })

      /*
       *
       * Canoeers
       *
       */

      .state('tabs.canoeers', {
        url: '/canoeers/:walletId',
        views: {
          'tab-home': {
            templateUrl: 'views/canoeers.html',
            controller: 'canoeersController'
          }
        }
      })

      /*
       *
       * Addresses
       *
       */

      .state('tabs.settings.addresses', {
        url: '/addresses/:walletId/:toAddress',
        views: {
          'tab-settings@tabs': {
            controller: 'addressesController',
            templateUrl: 'views/addresses.html'
          }
        }
      })
      .state('tabs.settings.allAddresses', {
        url: '/allAddresses/:walletId',
        views: {
          'tab-settings@tabs': {
            controller: 'addressesController',
            templateUrl: 'views/allAddresses.html'
          }
        }
      })

      /*
       *
       * Request Specific amount
       *
       */

      .state('tabs.paymentRequest', {
        url: '/payment-request',
        abstract: true,
        params: {
          id: null,
          nextStep: 'tabs.paymentRequest.confirm'
        }
      })

      .state('tabs.paymentRequest.amount', {
        url: '/amount/:coin',
        views: {
          'tab-receive@tabs': {
            controller: 'amountController',
            templateUrl: 'views/amount.html'
          }
        }
      })
      .state('tabs.paymentRequest.confirm', {
        url: '/confirm/:amount/:currency/:coin',
        views: {
          'tab-receive@tabs': {
            controller: 'customAmountController',
            templateUrl: 'views/customAmount.html'
          }
        }
      })

      /*
       *
       * Init backup flow
       *
       */

      .state('tabs.receive.backupWarning', {
        url: '/backupWarning/:from/:walletId',
        views: {
          'tab-receive@tabs': {
            controller: 'backupWarningController',
            templateUrl: 'views/backupWarning.html'
          }
        }
      })
      .state('tabs.receive.backup', {
        url: '/backup/:walletId',
        views: {
          'tab-receive@tabs': {
            controller: 'backupController',
            templateUrl: 'views/backup.html'
          }
        }
      })

      /*
       *
       * Paper Wallet
       *
       */

      .state('tabs.home.paperWallet', {
        url: '/paperWallet/:privateKey',
        views: {
          'tab-home@tabs': {
            controller: 'paperWalletController',
            templateUrl: 'views/paperWallet.html'
          }
        }
      })
      /*
       *
       * Onboarding
       *
       */

      .state('onboarding', {
        url: '/onboarding',
        abstract: true,
        template: '<ion-nav-view name="onboarding"></ion-nav-view>'
      })
      .state('onboarding.welcome', {
        url: '/welcome',
        views: {
          'onboarding': {
            templateUrl: 'views/onboarding/welcome.html',
            controller: 'welcomeController'
          }
        }
      })
      .state('onboarding.tour', {
        url: '/tour',
        views: {
          'onboarding': {
            templateUrl: 'views/onboarding/tour.html',
            controller: 'tourController'
          }
        }
      })
      .state('onboarding.collectEmail', {
        url: '/collectEmail/:walletId',
        views: {
          'onboarding': {
            templateUrl: 'views/onboarding/collectEmail.html',
            controller: 'collectEmailController'
          }
        }
      })
      .state('onboarding.createPassword', {
        url: '/createPassword',
        views: {
          'onboarding': {
            templateUrl: 'views/onboarding/createPassword.html',
            controller: 'createPasswordController'
          }
        }
      })
      .state('onboarding.backupRequest', {
        url: '/backupRequest/:walletId',
        views: {
          'onboarding': {
            templateUrl: 'views/onboarding/backupRequest.html',
            controller: 'backupRequestController'
          }
        }
      })
      .state('onboarding.backupWarning', {
        url: '/backupWarning/:from/:walletId',
        views: {
          'onboarding': {
            templateUrl: 'views/backupWarning.html',
            controller: 'backupWarningController'
          }
        }
      })
      .state('onboarding.backup', {
        url: '/backup/:walletId',
        views: {
          'onboarding': {
            templateUrl: 'views/backup.html',
            controller: 'backupController'
          }
        }
      })
      .state('onboarding.disclaimer', {
        url: '/disclaimer/:walletId/:backedUp/:resume',
        views: {
          'onboarding': {
            templateUrl: 'views/onboarding/disclaimer.html',
            controller: 'disclaimerController'
          }
        }
      })
      .state('onboarding.terms', {
        url: '/terms',
        views: {
          'onboarding': {
            templateUrl: 'views/onboarding/terms.html',
            controller: 'termsController'
          }
        }
      })
      .state('onboarding.import', {
        url: '/import',
        views: {
          'onboarding': {
            templateUrl: 'views/import.html',
            controller: 'importController'
          }
        },
        params: {
          code: null,
          fromOnboarding: null
        }
      })

      /*
       *
       * Feedback
       *
       */

      .state('tabs.feedback', {
        url: '/feedback',
        views: {
          'tab-settings@tabs': {
            templateUrl: 'views/feedback/send.html',
            controller: 'sendController'
          }
        }
      })
      .state('tabs.shareApp', {
        url: '/shareApp/:score/:skipped/:fromSettings',
        views: {
          'tab-settings@tabs': {
            controller: 'completeController',
            templateUrl: 'views/feedback/complete.html'
          }
        }
      })
      .state('tabs.rate', {
        url: '/rate',
        abstract: true
      })
      .state('tabs.rate.send', {
        url: '/send/:score',
        views: {
          'tab-home@tabs': {
            templateUrl: 'views/feedback/send.html',
            controller: 'sendController'
          }
        }
      })
      .state('tabs.rate.complete', {
        url: '/complete/:score/:skipped',
        views: {
          'tab-home@tabs': {
            controller: 'completeController',
            templateUrl: 'views/feedback/complete.html'
          }
        }
      })
      .state('tabs.rate.rateApp', {
        url: '/rateApp/:score',
        views: {
          'tab-home@tabs': {
            controller: 'rateAppController',
            templateUrl: 'views/feedback/rateApp.html'
          }
        }
      })
})
  .run(function ($rootScope, $state, $location, $log, $timeout, startupService, ionicToast, fingerprintService, $ionicHistory, $ionicPlatform, $window, appConfigService, lodash, platformInfo, profileService, uxLanguage, gettextCatalog, openURLService, storageService, scannerService, configService, emailService, /* plugins START HERE => */ applicationService) {
    uxLanguage.init()

    $ionicPlatform.ready(function () {
      if (screen.width < 768 && platformInfo.isCordova) { screen.lockOrientation('portrait') }

      if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard && !platformInfo.isWP) {
        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false)
        cordova.plugins.Keyboard.disableScroll(true)
      }

      window.addEventListener('native.keyboardshow', function () {
        document.body.classList.add('keyboard-open')
      })

      $ionicPlatform.registerBackButtonAction(function (e) {
        // from root tabs view
        var matchHome = $ionicHistory.currentStateName() === 'tabs.home'
        var matchReceive = $ionicHistory.currentStateName() === 'tabs.receive'
        var matchScan = $ionicHistory.currentStateName() === 'tabs.scan'
        var matchSend = $ionicHistory.currentStateName() === 'tabs.send'
        var matchSettings = $ionicHistory.currentStateName() === 'tabs.settings'

        var fromTabs = matchHome | matchReceive | matchScan | matchSend | matchSettings

        // onboarding with no back views
        var matchWelcome = $ionicHistory.currentStateName() === 'onboarding.welcome'
        var matchCollectEmail = $ionicHistory.currentStateName() === 'onboarding.collectEmail'
        var matchBackupRequest = $ionicHistory.currentStateName() === 'onboarding.backupRequest'
        var matchCreatePassword = $ionicHistory.currentStateName() === 'onboarding.createPassword'
        var backedUp = $ionicHistory.backView().stateName === 'onboarding.backup'
        var noBackView = $ionicHistory.backView().stateName === 'starting'
        var matchDisclaimer = !!($ionicHistory.currentStateName() === 'onboarding.disclaimer' && (backedUp || noBackView))

        var fromOnboarding = matchCollectEmail | matchBackupRequest | matchCreatePassword | matchWelcome | matchDisclaimer

        // views with disable backbutton
        var matchComplete = $ionicHistory.currentStateName() === 'tabs.rate.complete'
        var matchLockedView = $ionicHistory.currentStateName() === 'lockedView'
        var matchPin = $ionicHistory.currentStateName() === 'pin'

        if ($ionicHistory.backView() && !fromTabs && !fromOnboarding && !matchComplete && !matchPin && !matchLockedView) {
          $ionicHistory.goBack()
        } else
        if ($rootScope.backButtonPressedOnceToExit) {
          navigator.app.exitApp()
        } else {
          $rootScope.backButtonPressedOnceToExit = true
          $rootScope.$apply(function () {
            ionicToast.show(gettextCatalog.getString('Press again to exit'), 'bottom', false, 1000)
          })
          $timeout(function () {
            $rootScope.backButtonPressedOnceToExit = false
          }, 3000)
        }
        e.preventDefault()
      }, 101)

      $ionicPlatform.on('pause', function () {
        // Nothing to do
      })

      $ionicPlatform.on('resume', function () {
        applicationService.appLockModal('check')
      })

      $ionicPlatform.on('menubutton', function () {
        window.location = '#/preferences'
      })

      $log.info('Init profile...')
      // Try to open local profile
      profileService.loadAndBindProfile(function (err) {
        $ionicHistory.nextViewOptions({
          disableAnimate: true
        })
        if (err) {
          if (err.message && err.message.match('NOPROFILE')) {
            $log.debug('No profile... redirecting')
            $state.go('onboarding.welcome')
          } else if (err.message && err.message.match('NONAGREEDDISCLAIMER')) {
            if (lodash.isEmpty(profileService.getAccounts())) {
              $log.debug('No wallets and no disclaimer... redirecting')
              $state.go('onboarding.welcome')
            } else {
              $log.debug('Display disclaimer... redirecting')
              $state.go('onboarding.disclaimer', {
                resume: true
              })
            }
          } else {
            throw new Error(err) // TODO
          }
        } else {
          profileService.storeProfileIfDirty()
          $log.debug('Profile loaded ... Starting UX.')
          scannerService.gentleInitialize()
          // Reload tab-home if necessary (from root path: starting)
          $state.go('starting', {}, {
            'reload': true,
            'notify': $state.current.name !== 'starting'
          }).then(function () {
            $ionicHistory.nextViewOptions({
              disableAnimate: true,
              historyRoot: true
            })
            $state.transitionTo('tabs.home').then(function () {
              // Clear history
              $ionicHistory.clearHistory()
            })
            applicationService.appLockModal('check')
          })
        };
        // After everything have been loaded
        $timeout(function () {
          emailService.init() // Update email subscription if necessary
          openURLService.init()
        }, 1000)
      })
    })

    if (platformInfo.isNW) {
      var gui = require('nw.gui')
      var win = gui.Window.get()
      var nativeMenuBar = new gui.Menu({
        type: 'menubar'
      })
      try {
        nativeMenuBar.createMacBuiltin(appConfigService.nameCase)
        win.menu = nativeMenuBar
      } catch (e) {
        $log.debug('This is not OSX')
        win.menu = null
      }
    }

    $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
      $log.debug('Route change from:', fromState.name || '-', ' to:', toState.name)
      $log.debug('            toParams:' + JSON.stringify(toParams || {}))
      $log.debug('            fromParams:' + JSON.stringify(fromParams || {}))
    })
  })
