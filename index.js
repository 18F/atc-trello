'use strict';

require('dotenv').config();
const Trello = require('node-trello');
const bpa = require('bpa-trello-dashboard/app');
const PORT = process.env.PORT || 5000;
const t = new Trello(process.env.TRELLO_API_KEY, process.env.TRELLO_API_TOK);
const util = require('./util');

var crypto = require('crypto');

function verifyTrelloWebhookRequest(body, signature) {
  // Double-HMAC to blind any timing channel attacks
  // https://www.isecpartners.com/blog/2011/february/double-hmac-verification.asp
  var base64Digest = function (s) {
    return crypto.createHmac('sha1', process.env.TRELLO_CLIENT_SECRET).update(s).digest('base64');
  }
  var content = body + __HOSTNAME;
  var doubleHash = base64Digest(base64Digest(content));
  var headerHash = base64Digest(signature);
  return doubleHash == headerHash;
}

//const stageManager = new bpa.StageManager('runtime/bpa-stages.yaml', process.env.TRELLO_BPA_BOARD_ID);
//stageManager.run();

//const cardCreator = new bpa.CardCreator(null, process.env.TRELLO_BPA_BOARD_ID);

/* */
const http = require('http');
const webhookListener = http.createServer((req, res) => {
  if(req.method.toLowerCase() === 'post' || req.method.toLowerCase() === 'put') {
    let trelloEvent = '';
    console.log('Trello webhook call...');

    req.on('data', chunk => trelloEvent += chunk);
    req.on('end', () => {
      if(!verifyTrelloWebhookRequest(trelloEvent, req.headers['x-trello-webhook'])) {
        console.log('TRELLO SIGNATURE VERIFICATION FAILED');
        return;
      }
      console.log('Handling stuff')

      trelloEvent = JSON.parse(trelloEvent);

      if(trelloEvent.action.type === 'updateCard') {
        if(trelloEvent.action.data.listAfter && trelloEvent.action.data.listBefore) {
          // Card was moved
          if(trelloEvent.action.data.listAfter.name === 'In Flight') {
            console.log('Card was moved to In Flight');

            /* * /
            t.get(`/1/cards/${tEvent.action.data.card.id}`, (err, card) => {
              const bpas = card.desc.match(/BPA:([^\n]+)/gi).filter(bpa => bpa.indexOf("https://trello.com") < 0);

              const allBPACardPromises = [ ];
              for(let bpa of bpas) {
                allBPACardPromises.push(new Promise((bpaCardResolve, bpaCardReject) => {
                  cardCreator.createCard({
                    project: card.name,
                    order: bpa.substr(4).trim()
                  }).then(bpaCard => {
                    card.desc = card.desc.replace(bpa, `${bpa} ${bpaCard.url}`);
                    bpaCard.desc = bpaCard.desc.replace(`Project: ${card.name}`, `Project: ${card.url}`);
                    t.put(`/1/card/${bpaCard.id}`, bpaCard, () => { });
                    bpaCardResolve();
                  }).catch(err => {
                    console.log(err);
                    bpaCardResolve();
                  });
                }));
              }

              Promise.all(allBPACardPromises).then(() => {
                t.put(`/1/card/${card.id}`, card, (updateErr, data) => {
                  console.log(updateErr);
                  console.log(data);
                });
              });
            });
            //*/
          }
        }
      }

      res.end();
    })
  } else {
    res.end();
  }
});

var __HOSTNAME;
var __WEBHOOK_ID;

webhookListener.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening on local port ${PORT}`);
  util.getHostname(PORT).then(hostname => {
    console.log(`Now accessible at ${hostname}`);
    __HOSTNAME = hostname;
    t.post('/1/webhooks', {
      description: 'ATC Trello Webhook',
      callbackURL: hostname,
      idModel: process.env.ATC_TRELLO_BOARD_ID
    }, function(err, data) {
      if(err) {
        console.log('Error setting up Trello webhook');
        console.log(err);
        process.exit(20);
        return;
      }

      __WEBHOOK_ID = data.id;
      console.log(`Trello webhook registered [${data.id}]`);
    });
  }).catch(e => {
    console.log('Error getting hostname:');
    console.log(e);
    process.exit(10);
  });
});

function cleanup() {
  t.del(`/1/webhooks/${__WEBHOOK_ID}`, function(err, data) {
    if(err) {
      console.log('Error unregistering Trello webhook');
      console.log(err);
    } else {
      console.log('Trello webhook unregistered');
    }
    process.exit(0);
  });
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', () => {
});

//*/

/* * /
// webhook ID
t.post('/1/webhooks', {
  description: 'ATC Trello Webhook',
  callbackURL: 'http://darkcooger.ddns.net:9573',
  idModel: process.env.TRELLO_BOARD_ID
}, function(err, data) {
  console.log(`Err: ${err}`);
  console.log(err);
  console.log(data);
});
//*/
