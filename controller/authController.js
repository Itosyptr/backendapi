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
    // Gunakan Firebase REST API untuk sign in dengan email & password
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        email,
        password,
        returnSecureToken: true,
      }
    );

    res.status(200).send({
      success: true,
      message: 'Login successful',
      uid: response.data.localId,
      token: response.data.idToken,
    });
  } catch (error) {
    // Tangani error dari Firebase
    let errorMessage = 'Login failed';
    if (error.response) {
      switch (error.response.data.error.message) {
        case 'EMAIL_NOT_FOUND':
          errorMessage = 'Email tidak terdaftar';
          break;
        case 'INVALID_PASSWORD':
          errorMessage = 'Password salah';
          break;
        default:
          errorMessage = error.response.data.error.message;
      }
    }
    res.status(401).send({
      success: false,
      message: errorMessage,
    });
  }
};

module.exports = { registerUser, loginUser };
