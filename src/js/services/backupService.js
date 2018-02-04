'use strict'
/* global angular */
angular.module('canoeApp.services')
  .factory('backupService', function backupServiceFactory ($log, $timeout, profileService) {
    var root = {}

    var _download = function (ew, filename, cb) {
      var NewBlob = function (data, datatype) {
        var out

        try {
          out = new Blob([data], {
            type: datatype
          })
          $log.debug('case 1')
        } catch (e) {
          window.BlobBuilder = window.BlobBuilder ||
            window.WebKitBlobBuilder ||
            window.MozBlobBuilder ||
            window.MSBlobBuilder

          if (e.name == 'TypeError' && window.BlobBuilder) {
            var bb = new BlobBuilder()
            bb.append(data)
            out = bb.getBlob(datatype)
            $log.debug('case 2')
          } else if (e.name === 'InvalidStateError') {
            // InvalidStateError (tested on FF13 WinXP)
            out = new Blob([data], {
              type: datatype
            })
            $log.debug('case 3')
          } else {
            // We're screwed, blob constructor unsupported entirely
            $log.debug('Error')
          }
        }
        return out
      };

      var a = angular.element('<a></a>')
      var blob = new NewBlob(ew, 'text/plain;charset=utf-8')
      a.attr('href', window.URL.createObjectURL(blob))
      a.attr('download', filename)
      a[0].click()
      return cb()
    }

    root.walletExport = function (password, opts) {
      if (!password) {
        return null
      }
      try {
        var ewallet = profileService.getExportWallet()
        opts = opts || {}
        if (opts.addressBook) {
          ewallet.addressBook = opts.addressBook
        }
        return JSON.stringify(ewallet)
      } catch (err) {
        $log.debug('Error exporting wallet: ', err)
        return null
      }
    }

    root.walletDownload = function (password, opts, cb) {
      var ew = root.walletExport(password, opts)
      if (!ew) return cb('Could not create backup')
      var filename = 'canoe-exported-wallet.json'
      _download(ew, filename, cb)
    }
    return root
  })
