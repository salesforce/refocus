// CustomMulti.js

class CustomMulti {
    constructor(client) {
      this.client = client;
      this.commands = [];
      this.callbacks = [];
      this.finalCallback = null;
    }
  
    callback(cb) {
        // Register a callback for the last command
        this.callbacks.push(cb);
        return this;
    }
    
    exec(callback) {
      this.finalCallback = callback;
      const { client, commands, callbacks } = this;
      const multi = client.multi();
        console.log('commands in exec -==>>', commands);
      commands.forEach(({ method, args, callback: commandCallback }, index) => {
        const commandFunction = multi[method].bind(multi);
        commandFunction(...args);

        // Execute the callback immediately after the command is executed
        if (commandCallback) {
            multi.exec(commandCallback);
        }
      });
  
      return multi
      .exec()
      .then((replies) => {

        // Execute the callback for each command after exec completes
        commands.forEach(({ callback: commandCallback }, index) => {
            if (commandCallback) {
            commandCallback(null, replies[index]);
            }
        });

        if (this.finalCallback) {
          this.finalCallback(null, replies);
        }
        return Promise.resolve(replies);
      })
      .catch((err) => {
        if (this.finalCallback) {
          this.finalCallback(err, null);
        }
        return Promise.reject(err);
      });
    }
  }
  
  module.exports = CustomMulti;