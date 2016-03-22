'use strict';

require('dotenv').config();
const bpa = require('bpa-trello-dashboard/app');
const PORT = process.env.PORT || 5000;
const WebhookServer = require('./webhookServer');
const util = require('./util');
const log = util.getLogger('main');

const trelloWHServer = new WebhookServer(PORT);
//trelloWHServer.start();

function isMoveCardAction(action) {
  return (action.type === 'updateCard' && action.data.listAfter && action.data.listBefore);
}

trelloWHServer.start().then(s => s.on('data', e => {
  if(isMoveCardAction(e.action)) {
    if(e.action.data.listAfter.name === 'In Flight') {
      log.verbose('Card was moved to In Flight');
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

//const stageManager = new bpa.StageManager('runtime/bpa-stages.yaml', process.env.TRELLO_BPA_BOARD_ID);
//stageManager.run();

//const cardCreator = new bpa.CardCreator(null, process.env.TRELLO_BPA_BOARD_ID);

/* * /
const http = require('http');
const webhookListener = http.createServer((req, res) => {
  if(req.method.toLowerCase() === 'post' || req.method.toLowerCase() === 'put') {
    let trelloEvent = '';
    log.verbose('Got a webhook event');

    req.on('data', chunk => trelloEvent += chunk);
    req.on('end', () => {
      if(!verifyTrelloWebhookRequest(trelloEvent, req.headers['x-trello-webhook'])) {
        log.error('TRELLO SIGNATURE VERIFICATION FAILED');
        return;
      }
      log.verbose('Valid Trello webhook event');

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
            //* /
          }
        }
      }

      res.end();
    })
  } else {
    res.end();
  }
});
//*/
