const functions = require("firebase-functions");

const key = functions.config().stripe.key;

exports.charge = functions.https.onRequest((req, res) => {
  res.send(key ? "configured" : "missing");
});
