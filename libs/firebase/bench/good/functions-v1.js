// An existing v1 function, kept on purpose: the v1 API lives under firebase-functions/v1.
const functions = require("firebase-functions/v1");

exports.legacy = functions
  .region("us-central1")
  .firestore.document("posts/{postId}")
  .onCreate((snap, context) => console.log(context.params.postId));
