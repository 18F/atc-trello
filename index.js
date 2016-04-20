'use strict';

require('./util/env');
const PORT = process.env.PORT || 5000;
const app = require('./app');
const WebhookServer = require('@18f/trello-webhook-server');
const util = require('./util');
const log = util.getLogger('main');

util.getHostname(PORT)
  .then(hostname => {
    const trelloWHServer = new WebhookServer({
      port: PORT,
      hostURL: hostname,
      apiKey: process.env.TRELLO_API_KEY,
      apiToken: process.env.TRELLO_API_TOK,
      clientSecret: process.env.TRELLO_CLIENT_SECRET
    });

    return trelloWHServer.start(process.env.ATC_TRELLO_BOARD_ID)
      .then(webhookID => {
        log.info(`Trello Webhook ID: ${webhookID}`);
        trelloWHServer.on('data', e => {
          log.info('GOT A TRELLO EVENT')
          let promise = null;
          for(let handler of app.handlers) {
            if(promise) {
              promise = promise.then(handler);
            } else {
              promise = handler(e)
            }
          }
        });
      });
  }).catch(e => {
    log.error('Error starting Trello webhook server');
    log.error(e);
    process.kill(process.pid, 'SIGINT');
  });
