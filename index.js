'use strict';

require('dotenv').config();
const PORT = process.env.PORT || 5000;
const app = require('./app');
const WebhookServer = app.webhookServer;
const util = require('./util');
const log = util.getLogger('main');

const trelloWHServer = new WebhookServer(PORT);

trelloWHServer.start().then(s => s.on('data', e => {
  let promise = null;
  for(let handler of app.handlers) {
    if(promise) {
      promise = promise.then(handler);
    } else {
      promise = handler(e)
    }
  }
})).catch(e => {
  log.error('Error starting Trello webhook server');
  log.error(e);
  process.exit(10);
});

function cleanup() {
  trelloWHServer.cleanup().then(() => process.exit(0));
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', () => { });
