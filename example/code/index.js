exports.handler = (event, context, callback) => {
  // callback(null, 'qualifier: 1');
  // callback(null, 'qualifier: 2');
  // callback(null, 'qualifier: 3');
  callback(null, 'qualifier: latest + 1');
}
