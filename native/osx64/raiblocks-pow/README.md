# node-raiblocks-pow

Native compiled C Module for Node.js to calculate Proof of Work (PoW) value for a given RaiBlock Hash number (32-byte integer);

Based on [jaimehgb/RaiBlocksWebAssembly](https://github.com/jaimehgb/RaiBlocksWebAssemblyPoW), migrated to use node-gyp.

### Installation

```
npm install --save raiblocks-pow
```

### sync(hex)

* `hex` `<String>` 64-character hex string of previous block hash

Generate a work value for a given block hash synchronously.

**Returns** 16-character hex string of work value

This is also the default function exported, you may invoke it without specifying `sync`:

```js
const pow = require('raiblocks-pow');

// The following are the same:
const work1 = pow('<previous block hash>');
const work2 = pow.sync('<previous block hash>');
```

### async(hex, callback)

* `hex` `<String>` 64-character hex string of previous block hash
* `callback` `<Function>` Standard `error, result` arguments

Generate a work value for up to 10000000 iterations.

If no valid work is found in the given iterations, the callback will be called with a string result of `0`.

```js
pow.async(hash, (error, result) => {
  console.log('Found', result);
});
```

### threaded(hex, callback)

* `hex` `<String>` 64-character hex string of previous block hash
* `callback` `<Function>` Standard `error, result` arguments

Generate a work value until completion using multiple threads. (thread count = cpu count)

```js
pow.threaded(hash, (error, result) => {
  console.log('Found', result);
});
```

###

### Development

Use `npm test` to check a random block hash against an external threshold validation.
