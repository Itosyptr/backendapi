const admin = require('firebase-admin');

// Path ke file kredensial yang sudah diunduh
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
