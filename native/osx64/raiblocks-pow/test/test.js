const crypto = require('crypto');
const blake2 = require('blake2')

const pow = require('..');
const nanopow = require('nanopow-rs-node');

function hex_uint8(hex) {
	const length = (hex.length / 2) | 0;
	const uint8 = new Uint8Array(length);
	for(let i = 0; i < length; i++)
    uint8[i] = parseInt(hex.substr(i * 2, 2), 16);
	return uint8;
}

const randomBlockHash = crypto.randomBytes(32);

console.log(
  'Generating PoW for random hash',
  randomBlockHash.toString('hex'));

console.time('Generation Time');
const workValue = nanopow.generateWorkNoLimit(randomBlockHash.toString('hex'));
pow.threaded(randomBlockHash.toString('hex'), (error, workValue) => {
  console.timeEnd('Generation Time');

  const context = blake2.createHash('blake2b', {digestLength: 8});
  context.update(hex_uint8(workValue).reverse());
  context.update(Uint8Array.from(randomBlockHash));
  const score = context.digest();

  console.log('Work Value:', workValue);

  if(score[7] === 0xff
      && score[6] === 0xff
      && score[5] === 0xff
      && score[4] > 0xc0) console.log('Validation Successful!');
  else console.log('Validation Failure.');
});
