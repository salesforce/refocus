// createCustomMultiProxy.js

const CustomMulti = require('./CustomMulti');

const createCustomMultiProxy = (client) => {
  const customMulti = new CustomMulti(client);

  const customMultiProxy = new Proxy(customMulti, {
    get(target, prop) {
      if (typeof client[prop] === 'function' && prop !== 'exec') {
        return function (...args) {
          if (target.callbacks.length > 0) {
            target.callbacks[target.callbacks.length - 1] = ((err, res) => {
              console.log('Callback for', prop);
              target.callbacks.pop()(err, res);
            });
          }
          target.commands.push({ method: prop, args });
          return customMultiProxy;
        };
      } else if (prop === 'exec') {
        return async function () {
          try {
            const results = await target.exec();
            return results;
          } catch (error) {
            console.error('Error executing multi commands:', error);
            throw error;
          }
        };
      }
      return Reflect.get(target, prop);
    },
  });

  return customMultiProxy;
};

module.exports = createCustomMultiProxy;