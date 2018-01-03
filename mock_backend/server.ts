const express = require('express')
const app = express()

const bodyParser = require('body-parser')
app.use(bodyParser.json({
  type: () => true,  // don't confirm content type for now
}));


type RaiAccount = string;
type Block = string;

// list of accounts with the head block

let testAccount = "xrb_3e3j5tkog48pnny9dmfzj1r16pg8t1e76dz5tmac6iq689wyjfpi00000000";
let testBlock = "000D1BAEC8EC208142C99059B393051BAC8380F9B5A2E6B2489A277D81789F3F";
let accounts: { [a: RaiAccount]: Block } = {
    testAccount: testBlock
}

function getAccounts(wallet){
  return [testAccount];
}

function getBalances(accounts: RaiAccount[]){
  let result = {}
  for(let account of accounts){
    result[account] = {
      "balance": "1234567",
      "pending": "134566",
    }
  }
  return result;
}

function getFrontiers(account, count): { [a: RaiAccount]: Block } {
  // for now only handles count == 1
  return {account: testBlock}
}

function createWallet(): Block{
  // not sure what the best random function is here...
  return "000D1BAEC8EC208142C99059B393051BAC8380F9B5A2E6B2489A277D81789F3F";
}

let views:{
  [action: string]: (request, responseCallback) => void
} = {
  available_supply: (req, res) => {
    res.send({
      "available": "10000000",
    })
  },
  block_count: (req, res) => {
    res.send({
      "count": "1000",
      "unchecked": "10"
    })
  },
  frontier_count: (req, res) => {
    res.send({
      count: "1000",
    })
  },
  frontiers: (req, res) => {
    res.send({
      frontiers: getFrontiers(req.body.account, 1)
    })
  },
  account_create: (req, res) => {
    res.send({
      account: testAccount
    })
  },
  account_list: (req, res) => {
    res.send({
      accounts: getAccounts(req.body.wallet)
    })
  },
  peers: (req, res) => {
    res.send({
        "peers": {
          "[::ffff:172.17.0.1]:32841": "3"
        }
      }
    )
  },
  wallet_create: (req, res) => {
    res.send({
      wallet: createWallet()
    })
  },
  wallet_change_seed: (req, res) => {
    res.send({
      success: ""
    })
  },
  accounts_balances: (req, res) => {
    res.send({
      balances: getBalances(req.body.accounts)
    })
  }
}

app.post('/', function (req, res) {
  res.header('Access-Control-Allow-Origin', "*")
  let action = req.body.action;
  if (action in views) {
    views[action](req, res)
  } else {
    debugger;
  }
});


app.listen(7076, () => {
  console.log("Starting mock RPC server...");
})

