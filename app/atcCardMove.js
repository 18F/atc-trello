'use strict';

const util = require('../util');
const log = util.getLogger('atc card move');
const Trello = require('node-trello');
const bpa = require('bpa-trello-dashboard/app');

function isMoveCardAction(action) {
  return (action.type === 'updateCard' && action.data.listAfter && action.data.listBefore);
}

function addBpaCardsForAtc(cardID) {
  return new Promise(resolve => {
    const trello = new Trello(process.env.TRELLO_API_KEY, process.env.TRELLO_API_TOK);
    const bpaCardCreator = new bpa.CardCreator(null, process.env.BPA_TRELLO_BOARD_ID);

    trello.get(`/1/cards/${cardID}`, (err, trelloCard) => {
      const card = trelloCard;
      if (err) {
        log.error('Error getting Trello card');
        log.error(err);
        resolve();
        return;
      }

      // If one of the "BPA: " lines of the description already
      // has a link, don't need to create another card.
      let bpasNeeded = card.desc.match(/BPA:([^\n]+)/gi);
      if (bpasNeeded) {
        bpasNeeded = bpasNeeded.filter(bpaOrder => bpaOrder.indexOf('https://trello.com') < 0);
      } else {
        bpasNeeded = [];
      }
      const bpaPromises = [];
      const urlMaps = [];

      for (const bpaOrder of bpasNeeded) {
        bpaPromises.push(
          bpaCardCreator.createCard({
            project: card.name,
            order: bpaOrder.substr(4).trim(),
            trello: card.shortUrl
          }).then(bpaCard => {
            urlMaps.push({ bpa: bpaOrder, url: bpaCard.url });
          }).catch(ccErr => {
            log.error('Error creating BPA card');
            log.error(ccErr);
          })
        );
      }

      Promise.all(bpaPromises).then(() => {
        if (urlMaps.length) {
          for (const map of urlMaps) {
            card.desc = card.desc.replace(map.bpa, `BPA: ${map.url}`);
          }
          trello.put(`/1/card/${card.id}`, card, () => resolve());
        } else {
          resolve();
        }
      });
    });
  });
}

module.exports = function atcCardMovedHandler(e) {
  if (isMoveCardAction(e.action)) {
    if (e.action.data.listAfter.name === 'In Flight') {
      log.verbose('Card was moved to In Flight');
      return addBpaCardsForAtc(e.action.data.card.id).then(() => e);
    }
  }

  // If it wasn't a move, or the card wasn't
  // moved to In Flight, just return a resolved
  // promise so the chain can continue.
  return Promise.resolve(e);
};
