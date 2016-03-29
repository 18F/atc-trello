module.exports = {
  webhookServer: require('./webhookServer'),
  handlers: [
    require('./atcCardMove')
  ]
};
