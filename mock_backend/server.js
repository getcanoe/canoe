var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json({
    type: function () { return true; }
}));
// list of accounts with the head block
var testAccount = "xrb_36ahopo3rrmbpyb6xi3a41idjmpiidg5xgz45uxuc6pw3oubwxaec1pcp11j";
var testBlock = "000D1BAEC8EC208142C99059B393051BAC8380F9B5A2E6B2489A277D81789F3F";
function getAccounts(wallet) {
    return [testAccount];
}
function getBalances(accounts) {
    var result = {};
    accounts.forEach(
      function(account){
        result[account] = {
          balance: "12345670000000000000000000000000",
          pending: "13456600000000000000000000000"
        }
      }
    )

    return result;
}

function getFrontiers(account, count) {
    return { account: testBlock };
}
function createWallet() {
    // not sure what the best random function is here...
    return "000D1BAEC8EC208142C99059B393051BAC8380F9B5A2E6B2489A277D81789F3F";
}
var views = {
    available_supply: function (req, res) {
        res.send({
            available: "10000000"
        });
    },
    block_count: function (req, res) {
        res.send({
            count: "1000",
            unchecked: "10"
        });
    },
    frontier_count: function (req, res) {
        res.send({
            count: "1000"
        });
    },
    frontiers: function (req, res) {
        res.send({
            frontiers: getFrontiers(req.body.account, 1)
        });
    },
    account_create: function (req, res) {
        res.send({
            account: testAccount
        });
    },
    account_list: function (req, res) {
        res.send({
            accounts: getAccounts(req.body.wallet)
        });
    },
    peers: function (req, res) {
        res.send({
            peers: {
                "[::ffff:172.17.0.1]:32841": "3"
            }
        });
    },
    wallet_create: function (req, res) {
        res.send({
            wallet: createWallet()
        });
    },
    wallet_change_seed: function (req, res) {
        res.send({
            success: ""
        });
    },
    accounts_balances: function (req, res) {
        res.send({
            balances: getBalances(req.body.accounts)
        });
    }
};
app.post('/', function (req, res) {
    res.header('Access-Control-Allow-Origin', "*");
    var action = req.body.action;
    if (action in views) {
        views[action](req, res);
    }
    else {
      // if you hit this, then you should check out the Raiblocks RPC documentation and see what a good reply would be
      // and add it to the views dicitonary
      // https://github.com/clemahieu/raiblocks/wiki/RPC-protocol
      console.log("Action unimplemented in mock server: ", action);
      res.status(500);
      res.send("Umimplemented action");
    }
});
app.listen(7076, function () {
    console.log("Starting mock RPC server...");
});
