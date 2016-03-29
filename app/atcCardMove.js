"use strict";

const util = require('../util');
const log = util.getLogger('atc card move');
const Trello = require('node-trello');
const bpa = require('bpa-trello-dashboard/app');

function isMoveCardAction(action) {
  return (action.type === 'updateCard' && action.data.listAfter && action.data.listBefore);
}

function addBpaCardsForAtc(cardID) {
  return new Promise(resolve => {
    let trello = new Trello(process.env.TRELLO_API_KEY, process.env.TRELLO_API_TOK);
    const bpaCardCreator = new bpa.CardCreator(null, process.env.BPA_TRELLO_BOARD_ID);

    trello.get(`/1/cards/${cardID}`, (err, card) => {
      if(err) {
        log.error('Error getting Trello card');
        log.error(err);
        resolve();
        return;
      }

      // If one of the "BPA: " lines of the description already
      // has a link, don't need to create another card.
      let bpasNeeded = card.desc.match(/BPA:([^\n]+)/gi);
      if(bpasNeeded) {
        bpasNeeded = bpasNeeded.filter(bpa => bpa.indexOf("https://trello.com") < 0);
      } else {
        bpasNeeded = [ ];
      }
      const bpaPromises = [ ];

      for(const bpa of bpasNeeded) {
        bpaPromises.push(
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
          })
        );
      }

      Promise.all(bpaPromises).then(() => resolve());
    });
  });
}

module.exports = function(e) {
  if(isMoveCardAction(e.action)) {
    if(e.action.data.listAfter.name === 'In Flight') {
      log.verbose('Card was moved to In Flight');
      return addBpaCardsForAtc(e.action.data.card.id).then(() => e);
    }
  }

  // If it wasn't a move, or the card wasn't
  // moved to In Flight, just return a resolved
  // promise so the chain can continue.
  return Promise.resolve(e);
}
