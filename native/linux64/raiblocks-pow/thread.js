var addon = require('bindings')('functions.node')

process.on('message', hex => {
  addon.calculateAsync(hex, (error, result) => {
    process.send(result);
  });
});
