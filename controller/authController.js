const admin = require('../config/firebase.js');
require('dotenv').config();
require('firebase/auth');
const fetch = require('node-fetch');

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

    // Create user profile in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      username,
      email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
    } catch (emailError) {
      if (emailError.code === 'auth/user-not-found') {
        return res.status(404).send('User not found');
      }
    }
    
    const firebaseApiKey = process.env.FIREBASE_API_KEY;
    
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      if (data.error.message === 'INVALID_PASSWORD' || data.error.message === 'INVALID_LOGIN_CREDENTIALS') {
        return res.status(401).send('Email atau password salah');
      } else if (data.error.message === 'EMAIL_NOT_FOUND') {
        return res.status(404).send('User tidak ditemukan');
      }
      return res.status(400).send(data.error.message);
    }
    res.status(200).send({
      message: 'Login successful',
      uid: data.localId,
      token: data.idToken
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send('Terjadi kesalahan saat login. Silakan coba lagi.');
  }
};

module.exports = { 
  registerUser, 
  loginUser
};