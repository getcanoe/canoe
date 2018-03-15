const cp = require('child_process');
const os = require('os');

const addon = require('bindings')('functions.node');

function zeroPad(num, size) {
  // Max 32 digits
  var s = "00000000000000000000000000000000" + num;
  return s.substr(s.length-size);
}

module.exports = module.exports.sync = function(hex) {
  return zeroPad(addon.calculate(hex), 16);
};

module.exports.async = function(hex, cb) {
  addon.calculateAsync((error, result) => {
    cb(error, zeroPad(result, 16));
  });
};

module.exports.threaded = function(hex, cb) {
  const threads = [];
  const threadCount = os.cpus().length;
  for(let i =0; i < threadCount; i++) {
    let thread = cp.fork(__dirname + '/thread.js');
    threads.push(thread);
    thread.on('message', work => {
      if(work !== '0') {
        // Work found, stop workers and return!
        for(let j = 0; j< threads.length; j++) {
          threads[j].kill();
        }
        cb(null, zeroPad(work, 16));
      } else if(!thread.killed) {
        // Work not found in the given number of iterations, try again
        thread.send(hex);
      }
    });
    thread.send(hex);
  }
}

