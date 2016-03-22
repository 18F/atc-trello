"use strict";

const tap = require('tap');
const mock = require('mock-require');
const sinon = require('sinon');
const common = require('./common');
const utils = require('../util');

tap.test('Hostname provider', t1 => {
  const testPortNumber = 9999;
  const testHostName = 'Test Host';

  t1.test('With hostname and localtunnel env var unset', t2 => {

    delete process.env.HOST;
    delete process.env.LOCALTUNNEL;

    utils.getHostname(testPortNumber).catch(() => {
      t2.pass('it rejects');
      t2.done();
      common.resetEnvVars();
    });
  });

  t1.test('With hostname env var set and localtunnel env var unset', t2 => {
    process.env.HOST = testHostName;
    delete process.env.LOCALTUNNEL;

    utils.getHostname(testPortNumber).then(host => {
      t2.equal(host, testHostName, 'resolves hostname from env var');
      t2.done();
      common.resetEnvVars();
    })
  });

  t1.test('With hostname env var unset and localtunnel env var set', t2 => {
    let err = new Error('Test Error');
    const onMock = sinon.spy();

    t2.beforeEach(done => {
      delete process.env.HOST
      process.env.LOCALTUNNEL = 'true';

      mock('localtunnel', sinon.stub().yieldsAsync(err, { on: onMock, url: testHostName }));
      done();
    });
    t2.afterEach(done => {
      mock.stop('localtunnel');
      common.resetEnvVars();
      err = null;
      done();
    });

    t2.test('With error from localtunnel', t3 => {
      utils.getHostname(testPortNumber).then(x => {
        t3.fail('resolved instead of rejecting');
        t3.done();
      }).catch(e => {
        t3.equal(require('localtunnel').callCount, 1, 'calls localtunnel once');
        t3.equal(onMock.callCount, 0, 'never calls localtunnel event subscription');
        t3.equal(e, err, 'rejects with an error');
        t3.done();
      });
    });

    t2.test('With no error from localtunnel', t3 => {
      utils.getHostname(testPortNumber).then(host => {
        t3.equal(require('localtunnel').callCount, 1, 'calls localtunnel once');
        t3.equal(onMock.callCount, 1, 'calls localtunnel event subscription once');
        t3.equal(onMock.args[0][0], 'close', 'subscribes to the close event');
        t3.equal(host, testHostName, 'resolves the expected hostname');
        t3.done();
      }).catch(e => {
        t3.fail('rejected instead of resolving');
        t3.done();
      });
    });
    t2.done();
  });

  t1.test('Handles localtunnel close event', t2 => {
    delete process.env.HOST
    process.env.LOCALTUNNEL = 'true';
    const onMock = sinon.spy();
    mock('localtunnel', sinon.stub().yieldsAsync(null, { on: onMock, url: testHostName }));

    utils.getHostname(testPortNumber).then(host => {
      t2.equal(onMock.callCount, 1, 'calls localtunnel event subscription once');
      t2.equal(onMock.args[0][0], 'close', 'subscribes to the close event');
      t2.equal(typeof onMock.args[0][1], 'function', 'subscribes with a function');
      try {
        onMock.args[0][1]();
        t2.pass('event handler does not throw');
      } catch(e) {
        t2.fail('event handler throws');
      }
      mock.stop('localtunnel');
      common.resetEnvVars();
      t2.done();
    }).catch((e) => {
      t2.fail('rejected instead of resolving');
      mock.stop('localtunnel');
      common.resetEnvVars();
      t2.done();
    })
  })

  t1.done();
});
