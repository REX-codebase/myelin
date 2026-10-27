const functions = require("firebase-functions");

exports.onPost = functions
  .region("europe-west1")
  .runWith({ memory: "512MB" })
  .firestore.document("posts/{postId}")
  .onCreate((snap, context) => {
    console.log(context.params.postId, snap.data());
  });

exports.nightly = functions.pubsub.schedule("every 24 hours").onRun(() => null);
