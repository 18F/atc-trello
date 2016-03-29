"use strict";

const tap = require('tap');
const sinon = require('sinon');
const trello = require('node-trello');
const bpa = require('bpa-trello-dashboard/app');
const common = require('./common');
const util = require('../util');
const atcCardMove = require('../app/atcCardMove');

tap.test('ATC Card Move handler', t1 => {
  const sandbox = sinon.sandbox.create();

  t1.beforeEach(done => {
    common.resetEnvVars();
    sandbox.restore();
    done();
  });

  const doTest = function(e, test, done) {
    if(!done) {
      done = () => null;
    }
    return atcCardMove(e)
      .then(eResolved => {
        test.equal(eResolved, e, 'resolves the event object');
        test.pass('resolves');
        done();
      })
      .catch(() => {
        test.fail('resolves');
        done();
      });
  };

  t1.test('When card is not moved', t2 => {

    t2.test('Action is not a card update', t3 => {
      const e = {
        action: {
          type: 'not-update',
          data: {
            listAfter: { },
            listBefore: { }
          }
        }
      };
      doTest(e, t3, t3.end);
    });

    t2.test('No listAfter property', t3 => {
      const e = {
        action: {
          type: 'updateCard',
          data: {
            listBefore: { }
          }
        }
      };
      doTest(e, t3, t3.end);
    });

    t2.test('No listBefore property', t3 => {
      const e = {
        action: {
          type: 'updateCard',
          data: {
            listAfter: { }
          }
        }
      };
      doTest(e, t3, t3.end);
    });

    t2.end();
  });

  t1.test('When card is moved', t2 => {
    t2.test('Not moved to In Flight', t3 => {
      const e = {
        action: {
          type: 'updateCard',
          data: {
            listAfter: { name: 'Wrong list' },
            listBefore: { }
          }
        }
      };
      doTest(e, t3, t3.end);
    });

    t2.test('Moved to In Flight', t3 => {
      const e = {
        action: {
          type: 'updateCard',
          data: {
            listAfter: { name: 'In Flight' },
            listBefore: { },
            card: {
              id: 'card-id'
            }
          }
        }
      };

      let trelloGet, trelloPut;
      let createCard;

      t2.beforeEach(done => {
        process.env.TRELLO_API_KEY = 'trello-api-key';
        process.env.TRELLO_API_TOK = 'trello-api-token';
        process.env.BPA_TRELLO_BOARD_ID = 'bpa-trello-board-id';

        trelloGet = sandbox.stub(trello.prototype, 'get');
        trelloPut = sandbox.stub(trello.prototype, 'put');
        createCard = sandbox.stub(bpa.CardCreator.prototype, 'createCard');

        trelloPut.yields(null, null);
        done();
      });

      t3.test('There is an error getting the card from Trello', t4 => {
        trelloGet.yields(new Error('Test Error'), null);
        doTest(e, t4).then(() => {
          t4.equal(trelloGet.callCount, 1, 'calls Trello get once');
          t4.end();
        });
      });

      t3.test('Trello returns a valid card with no BPA orders', t4 => {
        trelloGet.yields(null, { desc: '' });
        doTest(e, t4).then(() => {
          t4.equal(trelloGet.callCount, 1, 'calls Trello get once');
          t4.end();
        });
      });

      t3.test('Trello returns a valid card with 3 BPA orders', t4 => {
        t4.test('BPA create card fails', t5 => {
          trelloGet.yields(null, { desc: 'BPA: Order 1\nBPA: Order 2\nBPA: Order 3' });
          createCard.rejects(new Error('Test Error'));
          doTest(e, t5).then(() => {
            t5.equal(trelloGet.callCount, 1, 'calls Trello get once');
            t5.equal(createCard.callCount, 3, 'calls createCard 3 times');
            t5.equal(trelloPut.callCount, 0, 'calls Trello put 0 times');
            t5.end();
          });
        });

        t4.test('BPA create card succeeds', t5 => {
          trelloGet.yields(null, { desc: 'BPA: Order 1\nBPA: Order 2\nBPA: Order 3' });
          createCard.resolves({ url: 'some-url' });
          doTest(e, t5).then(() => {
            t5.equal(trelloGet.callCount, 1, 'calls Trello get once');
            t5.equal(createCard.callCount, 3, 'calls createCard 3 times');
            t5.equal(trelloPut.callCount, 1, 'calls Trello put once');
            t5.end();
          });
        });

        t4.end();
      });

      t3.end();
    });

    t2.end();
  });

  t1.end();
});
