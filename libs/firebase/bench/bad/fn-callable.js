const { onCall } = require("firebase-functions/https");

exports.addNumbers = onCall((data, context) => {
  if (!context.auth) throw new Error("sign in first");
  return data.a + data.b;
});
