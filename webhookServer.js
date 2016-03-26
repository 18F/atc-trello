"use strict";

const Trello = require('node-trello');
const http = require('http');
const crypto = require('crypto');
const util = require('./util');
const log = util.getLogger('webhook server');

function verifyTrelloWebhookRequest(hostname, body, signature) {
  // Double-HMAC to blind any timing channel attacks
  // https://www.isecpartners.com/blog/2011/february/double-hmac-verification.asp
  var base64Digest = function (s) {
    return crypto.createHmac('sha1', process.env.TRELLO_CLIENT_SECRET).update(s).digest('base64');
  }
  var content = body + hostname;
  var doubleHash = base64Digest(base64Digest(content));
  var headerHash = base64Digest(signature);
  return doubleHash === headerHash;
}

class TrelloWebhookServer {
  constructor(port) {
    let numPort = Number(port);
    if(Number.isNaN(numPort) || numPort < 0 || numPort > 65535) {
      log.error(`Port [${port}] is invalid - must be a number between 1 and 65535`);
      throw new Error('Port must be numeric, greater than 0 and less than 65536');
    }
    this._port = numPort;
    this._handlers = { data: [ ] };
    this._trello = new Trello(process.env.TRELLO_API_KEY, process.env.TRELLO_API_TOK);
  }

  cleanup() {
    return new Promise(resolve => {
      log.info('Shutting down');
      if(this._webhookID) {
        this._trello.del(`/1/webhooks/${this._webhookID}`, function(err, data) {
          if(err) {
            log.error('Error unregistering Trello webhook');
            log.error(err);
          } else {
            log.info('Trello webhook unregistered');
          }
          resolve();
        });
      }
      else {
        resolve();
      }
    });
  }

  start() {
    return new Promise((resolve, reject) => {
      this._server = http.createServer((req, res) => {
        if(req.method.toLowerCase() === 'head') {
          res.statusCode = 200;
          res.end();
        }
        else if(req.method.toLowerCase() === 'post' || req.method.toLowerCase() === 'put') {
          let trelloEvent = '';
          log.verbose('Got a webhook event');

          req.on('data', chunk => trelloEvent += chunk);
          req.on('end', () => {
            if(!verifyTrelloWebhookRequest(this._hostname, trelloEvent, req.headers['x-trello-webhook'] || '')) {
              log.error('TRELLO SIGNATURE VERIFICATION FAILED');
              res.statusCode = 400;
              res.end();
              return;
            }
            log.verbose('Valid Trello webhook event');
            res.statusCode = 200;
            res.end();

            trelloEvent = JSON.parse(trelloEvent);
            for(const handler of this._handlers.data) {
              handler(trelloEvent);
            }
          });
        }
      });

      this._server.listen(this._port, '0.0.0.0', () => {
        log.info(`Listening on local port ${this._port}`);
        util.getHostname(this._port).then(hostname => {
          log.info(`Now accessible at ${hostname}`);
          this._hostname = hostname;
          this._trello.post('/1/webhooks', {
            description: 'ATC Trello Webhook',
            callbackURL: hostname,
            idModel: process.env.ATC_TRELLO_BOARD_ID
          }, function(err, data) {
            if(err) {
              log.error('Error setting up Trello webhook');
              log.error(err);
              reject(err);
            }

            this._webhookID = data.id;
            log.info(`Trello webhook registered [${data.id}]`);
            resolve(this);
          }.bind(this));
        }).catch(e => {
          log.error('Error getting hostname:');
          log.error(e);
          reject(e);
        });
      });
    });
  }

  on(eventName, handler) {
    if(this._handlers[eventName] && typeof handler === 'function') {
      this._handlers[eventName].push(handler)
    }

    return this;
  }
}

module.exports = TrelloWebhookServer;
