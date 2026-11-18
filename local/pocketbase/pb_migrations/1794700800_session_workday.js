migrate((app) => {
  const operators = app.findCollectionByNameOrId('mina_operators');
  // A stolen bearer token must not retain the old default long validity.
  operators.authToken.duration = 8 * 60 * 60;
  app.save(operators);
}, (app) => {
  throw new Error('Restore a verified backup rather than lengthening session validity.');
});
