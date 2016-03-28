'use strict';

require('dotenv').config();
const Trello = require('node-trello');
const bpa = require('bpa-trello-dashboard/app');
const PORT = process.env.PORT || 5000;
const WebhookServer = require('./webhookServer');
const util = require('./util');
const log = util.getLogger('main');

const trelloWHServer = new WebhookServer(PORT);

function isMoveCardAction(action) {
  return (action.type === 'updateCard' && action.data.listAfter && action.data.listBefore);
}

const bpaCardCreator = new bpa.CardCreator(null, process.env.BPA_TRELLO_BOARD_ID);

function addBpaCardsForAtc(cardID) {
  let trello = new Trello(process.env.TRELLO_API_KEY, process.env.TRELLO_API_TOK);
  trello.get(`/1/cards/${cardID}`, (err, card) => {
    if(err) {
      log.error('Error getting Trello card');
      log.error(err);
      return;
    }

    // If one of the "BPA: " lines of the description already
    // has a link, don't need to create another card.
    const bpasNeeded = card.desc.match(/BPA:([^\n]+)/gi).filter(bpa => bpa.indexOf("https://trello.com") < 0);
    for(const bpa of bpasNeeded) {
      bpaCardCreator.createCard({
        project: card.name,
        order: bpa.substr(4).trim(),
        trello: card.shortUrl
      }).then(bpaCard => {
        card.desc = card.desc.replace(bpa, `BPA: ${bpaCard.url}`);
        trello.put(`/1/card/${card.id}`, card, () => { });
      }).catch(err => {
        log.error('Error creating BPA card');
        log.error(err);
      });
    }
  });
}

trelloWHServer.start().then(s => s.on('data', e => {
  if(isMoveCardAction(e.action)) {
    if(e.action.data.listAfter.name === 'In Flight') {
      log.verbose('Card was moved to In Flight');
      addBpaCardsForAtc(e.action.data.card.id);
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
