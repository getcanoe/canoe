var RaiWallet = require('../../Wallet.js')
var Block = require('../../Block.js')
RAI = {}
RAI.createNewWallet = function (password, seed) {
  return new RaiWallet(password)
}