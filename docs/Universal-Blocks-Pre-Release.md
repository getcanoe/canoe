# NEP-01: Universal Blocks
![NANO](https://nano.org/assets/img/logo.svg)

Universal Blocks is an improvement proposal that:

1. Simplifies account balance computation.
2. Enables inexensive hardware to easily and securely sign transactions
3. Greatly simplifies pruning of the block-lattice

## Terminology
| Symbol | Description | Example |
| ------ | ----------- | ------- |
| $$\|$$ | Concatenation | $$``Rai" \| ``Blocks" = ``RaiBlocks"$$ |
| $$H(\cdot)$$  | Blake2b Hash with 32bit digest size | $$H(``RaiBlocks") = 0x1c42e03cd...$$ |
| $$S(\cdot)$$  | ED25519 Sign

## Old Transaction Types
Currently there are 4 transaction types: open, send, receive, and change.

### Open
To create an account, you need to issue an *open* transaction. An open transaction is always the first transaction of every account-chain and can be created upon the first receipt of funds. The *account* field stores the public-key (address) derived from the private-key that is used for signing. The *source* field contains the hash of the transaction that sent the funds. On account creation, a representative must be chosen to vote on your behalf; this can be changed later with a *change* transaction. The account can declare itself as its own representative.

```json
{
   account: DC04354B1...AE8FA2661B2,
   source: DC1E2B3F7C...182A0E26B4A,
   representative: xrb_1anr...posrs,
   work: 0000000000000000,
   type: open,
   signature: 83B0...006433265C7B204
}
```

### Send
To send from an address, the address must already have an existing open block, and therefore a balance. The *previous* field contains the hash of the previous block in the account-chain. The *destination* field contains the account for funds to be sent to. A send block is immutable once confirmed. Once broadcasted to the network, funds are immediately deducted from the balance of the sender’s account and wait as *pending* until the receiving party signs a block to accept these funds. Pending funds should not be considered awaiting confirmation, as they are as good as spent from the sender’s account and the sender cannot revoke the transaction.
```json
{
   previous: 1967EA355...F2F3E5BF801,
   balance: 010a8044a0...1d49289d88c,
   destination: xrb_3w...m37goeuufdp,
   work: 0000000000000000,
   type: send,
   signature: 83B0...006433265C7B204
}
```
### Receive
To complete a transaction, the recipient of sent funds must create a receive block on their own account-chain. The source field references the hash of the associated send transaction. Once this block is created and broadcasted, the account’s balance is updated and the funds have officially moved into their account.
```json
{
   previous: DC04354B1...AE8FA2661B2,
   source: DC1E2B3F7C6...182A0E26B4A,
   work: 0000000000000000,
   type: receive,
   signature: 83B0...006433265C7B204
}
```

### Change
Account holders having the ability to choose a representative to vote on their behalf is a powerful decentralization tool that has no strong analog in Proof of Work or Proof of Stake protocols. In conventional PoS systems, the account owner's node must be running to participate in voting. Continuously running a node is impractical for many users; giving a representative the power to vote on an account's behalf relaxes this requirement. Account holders have the ability to reassign consensus to any account at any time. A *change* transaction changes the representative of an account by subtracting the vote weight from the old representative and adding the weight to the new representative. No funds are moved in this transaction, and the representative does not have spending power of the account's funds.
```json
{
   previous: DC04354B1...AE8FA2661B2,
   representative: xrb_1anrz...posrs,
   work: 0000000000000000,
   type: change,
   signature: 83B0...006433265C7B204
}
```

## New Universal Block
The new universal block combines all 4 old transaction types into a single block. Because of this, the "type" of the block isn't explicitly designated.
| Key | Value Description |
| --- | ----------------- |
| previous       | Previous head block on account; 0 if *open* block. |
| target         | Destination if *balance* is decreasing. Source block if balance is increasing. 0 if purely a ``change`` block. |
| representative | Representative xrb_ address. |
| account        | This account's xrb_ address. |
| balance        | Resulting balance after this transaction. |
| work           | Proof of Work string. |
| signature      | $$S(previous\|target\|representative\|balance\|account)$$ |

The following examples are assumed to be in sequential order on the example account-chain.
##### Example 1) Open
Lets say that address ``xrb_1q3hqecaw15cjt7thbtxu3pbzr1eihtzzpzxguoc37bj1wc5ffoh7w74gi6p`` sends 1XRB to account  ``xrb_3arg3asgtigae3xckabaaewkx3bzsh7nwz7jkmjos79ihyaxwphhm6qgjps4``, which doesn't have an open block yet. Lets also assume that the send block hash was ``B684C3602BCA3C76F13283028502DA871964F8E31365B391AA2D77CA3A43E922``.

An open block for ``xrb_3arg3asgtigae3xckabaaewkx3bzsh7nwz7jkmjos79ihyaxwphhm6qgjps4``, setting ``xrb_1stofnrxuz3cai7ze75o174bpm7scwj9jn3nxsn8ntzg784jf1gzn1jjdkou`` as the representative, and receiving the above mentioned block would have the following key-pairs:
```json
{
	"previous": "0",
	"target": "B684C3602BCA3C76F13283028502DA871964F8E31365B391AA2D77CA3A43E922",
	"representative": "xrb_1stofnrxuz3cai7ze75o174bpm7scwj9jn3nxsn8ntzg784jf1gzn1jjdkou",
	"account": "xrb_3arg3asgtigae3xckabaaewkx3bzsh7nwz7jkmjos79ihyaxwphhm6qgjps4",
	"balance": "1000000000000000000000000000000",
	"work": "E9F63FA08156C202",
	"signature": "8B59DD10E7CB4321F9CCBD702050495F5FDC8C3842F8DAA4BDF1..."
}
```
Note that the balance field is in ``raw``, and there are $$10^{30}$$ raw in 1XRB.

Assume that the above ``open`` transaction has a resulting hash ``8E4383AF71E18E81911CF8202AE1C6DA96F52835FB358D0753C873620BFC051A`` for the next example.

##### Example 2) Receive
Lets say that address ``xrb_1q3hqecaw15cjt7thbtxu3pbzr1eihtzzpzxguoc37bj1wc5ffoh7w74gi6p`` sends 5XRB to ``xrb_3arg3asgtigae3xckabaaewkx3bzsh7nwz7jkmjos79ihyaxwphhm6qgjps4`` and that the send block hash was ``B2EC73C1F503F47E051AD72ECB512C63BA8E1A0ACC2CEE4EA9A22FE1CBDB693F``. The corresponding receive block on the account-chain would be:
```json
{
	"previous": "8E4383AF71E18E81911CF8202AE1C6DA96F52835FB358D0753C873620BFC051A",
	"target": "B2EC73C1F503F47E051AD72ECB512C63BA8E1A0ACC2CEE4EA9A22FE1CBDB693F",
	"representative": "xrb_1stofnrxuz3cai7ze75o174bpm7scwj9jn3nxsn8ntzg784jf1gzn1jjdkou",
	"account": "xrb_3arg3asgtigae3xckabaaewkx3bzsh7nwz7jkmjos79ihyaxwphhm6qgjps4",
	"balance": "6000000000000000000000000000000",
	"work": "AF4D9883B0E1817D",
	"signature": "7276B046AD11E8934F2E8CF98935BE4EA1F149A8871DC1486FE0..."
}
```
Assume that the above ``receive`` transaction has a resulting hash ``83AF71E18ED0753C82AE1CC3543A86DA96F573620BF191105188E5FBCF820283`` for the next example.

##### Example 3) Send
Now our account ``xrb_3arg3asgtigae3xckabaaewkx3bzsh7nwz7jkmjos79ihyaxwphhm6qgjps4`` wants to send 2XRB back to ``xrb_1q3hqecaw15cjt7thbtxu3pbzr1eihtzzpzxguoc37bj1wc5ffoh7w74gi6p``. The send transaction would be:
```json
{
	"previous": "83AF71E18ED0753C82AE1CC3543A86DA96F573620BF191105188E5FBCF820283",
	"target": "xrb_1q3hqecaw15cjt7thbtxu3pbzr1eihtzzpzxguoc37bj1wc5ffoh7w74gi6p",
	"representative": "xrb_1stofnrxuz3cai7ze75o174bpm7scwj9jn3nxsn8ntzg784jf1gzn1jjdkou",
	"account": "xrb_3arg3asgtigae3xckabaaewkx3bzsh7nwz7jkmjos79ihyaxwphhm6qgjps4",
	"balance": "4000000000000000000000000000000",
	"work": "817D83A0EAF4D982",
	"signature": "935B8CF989A1F1472767E4E46AD11E89B0A8834F2E1DC1486FE0..."
}
```
Assume that the above ``receive`` transaction has a resulting hash ``EB286B6B09317DDFD332F23ACB71E376158C202E81B3B11FE38C1C918067D6F6`` for the next example.

##### Example 4) Change Representative
Lets say we want to change our representative to ``xrb_1anrzcuwe64rwxzcco8dkhpyxpi8kd7zsjc1oeimpc3ppca4mrjtwnqposrs``.
```json
{
	"previous": "EB286B6B09317DDFD332F23ACB71E376158C202E81B3B11FE38C1C918067D6F6",
	"target": "0",
	"representative": "xrb_1anrzcuwe64rwxzcco8dkhpyxpi8kd7zsjc1oeimpc3ppca4mrjtwnqposrs",
	"account": "xrb_3arg3asgtigae3xckabaaewkx3bzsh7nwz7jkmjos79ihyaxwphhm6qgjps4",
	"balance": "4000000000000000000000000000000",
	"work": "AF4D9883B0E1817D",
	"signature": "6277DEC9D581B7423738C03DE2FCEC1FDE1E3F35B9D96C00935B..."
	
}
```
Assume that the above ``receive`` transaction has a resulting hash ``02C03F6051427C52D07EF656B7167D76DE8626B92C26582BF6982AB1C9091EB7`` for the next example.

##### Example 5) Change Representative & Send
You can change your representative while performing a send or receive. Lets send 3 more XRB to ``xrb_1q3hqecaw15cjt7thbtxu3pbzr1eihtzzpzxguoc37bj1wc5ffoh7w74gi6p``. Lets also revert back and make ``xrb_1stofnrxuz3cai7ze75o174bpm7scwj9jn3nxsn8ntzg784jf1gzn1jjdkou`` our representative again.
```json
{
	"previous": "02C03F6051427C52D07EF656B7167D76DE8626B92C26582BF6982AB1C9091EB7",
	"target": "xrb_1q3hqecaw15cjt7thbtxu3pbzr1eihtzzpzxguoc37bj1wc5ffoh7w74gi6p",
	"representative": "xrb_1stofnrxuz3cai7ze75o174bpm7scwj9jn3nxsn8ntzg784jf1gzn1jjdkou",
	"account": "xrb_3arg3asgtigae3xckabaaewkx3bzsh7nwz7jkmjos79ihyaxwphhm6qgjps4",
	"balance": "1000000000000000000000000000000",
	"work": "07DE8188AB5811F7",
	"signature": "AA11D499C7C3F1C769D4F1D43DCD086E8760D3C0B70EB2F15C7F..."
}
```

## Benefits

#### Hardware Wallet
Previously it was impractical for a hardware wallet to securely sign a send transaction amount since the account balance may not have yet been encoded into the account chain. Now only the previous head block and the new transaction data is required to trustlessly sign transactions on a hardware wallet:
1. Computer sends head block to wallet.
2. Wallet verifies:
    1. The signature
    2. The proof of work
3. Wallet then computes the block hash
4. Computer sends new transaction data, including the PoW.
5. Wallet verifies/computes:
    1. The previous block matches the hash computed in part 3
    2. (optional) The PoW is valid
6. If Representative changes from previous block, prompt user
7. Prompt user on transaction value if non-zero
8. Sign transaction and send back to computer to be broadcasted

#### Pruning
Since the latest headblock contains the complete current state of an account, all previous blocks can be securely deleted. This will decrease disk usage, speed up database search, and lower hardware requirements for pruned nodes. Representative nodes should maintain more than just the headblock in the case of forks.
