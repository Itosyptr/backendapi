const admin = require('../config/firebase.js');

// Fungsi untuk registrasi user
const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  if (!email || !password || !username) {
    return res.status(400).send('Please provide email, password, and username.');
  }

  try {
    // Membuat user baru di Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: username,
    });

    res.status(201).send({
      message: 'User registered successfully',
      userId: userRecord.uid,
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
};

// Fungsi untuk login user
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send('Please provide email and password.');
  }

  try {
    // Verifikasi apakah email ada di Firebase Authentication
    const user = await admin.auth().getUserByEmail(email);
    res.status(200).send({
      message: 'Login successful',
      uid: user.uid,
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
};

module.exports = { registerUser, loginUser };
