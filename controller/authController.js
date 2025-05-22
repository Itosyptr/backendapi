const { db } = require('../config/firebase');
require('dotenv').config();
require('firebase/auth');
const {
  hashPassword,
  comparePassword,
  validatePasswordStrength
} = require('../utils/authHelper');
const { getCurrentTimestamp } = require('../utils/datetimeHelper');

// Fungsi untuk registrasi user
const registerUser = async (req, res) => {
  const { username, email, password, nim } = req.body;
  if (!email || !password || !username || !nim) {
    return res.status(400).json({ error: 'Username, email, password, and NIM are required' });
  }

  if (!validatePasswordStrength(password)) {
    return res.status(400).json({
      error: 'Password harus mengandung minimal 8 karakter, huruf besar, huruf kecil, angka, dan karakter khusus'
    });
  }

  if (!/^\d+$/.test(nim)) { // Memastikan NIM hanya berisi angka
    return res.status(400).json({ error: 'NIM harus berupa angka' });
  }


  const timestamp = getCurrentTimestamp();
  const usersRef = db.ref('users');
  const profilesRef = db.ref('profiles');

  // Check if user exists in either collection
  const emailCheck = await usersRef.orderByChild('email').equalTo(email).once('value');
  const usernameCheck = await profilesRef.orderByChild('name').equalTo(username).once('value');
  // Opsional: Tambahkan pengecekan NIM jika NIM juga harus unik
  const nimCheck = await profilesRef.orderByChild('nim').equalTo(nim).once('value');


  if (emailCheck.exists() || usernameCheck.exists() || nimCheck.exists()) { // Tambahkan nimCheck
    // Sesuaikan pesan error jika NIM juga dicek
    let errorMessage = 'User already exists';
    if (emailCheck.exists()) errorMessage = 'Email sudah terdaftar';
    else if (usernameCheck.exists()) errorMessage = 'Username sudah terdaftar';
    else if (nimCheck.exists()) errorMessage = 'NIM sudah terdaftar'; // Pesan spesifik untuk NIM
    return res.status(400).json({ error: errorMessage });
  }

  // Create user in both collections
  const hashedPassword = await hashPassword(password);
  const newUserRef = usersRef.push();
  const newProfileRef = profilesRef.push();

  await Promise.all([
    newUserRef.set({
      username,
      email,
      password: hashedPassword,
      createdAt: timestamp,
      updatedAt: timestamp,
      profileId: newProfileRef.key,
      nim // <-- Tambahkan NIM di sini
    }),
    newProfileRef.set({
      username, // Ini kemungkinan akan menjadi 'name' di sisi Android
      email,
      nim, // <-- Tambahkan NIM di sini
      createdAt: timestamp,
      updatedAt: timestamp,
      userId: newUserRef.key
    })
  ]);

  res.status(201).json({
    message: 'User successfully registered',
    userId: newUserRef.key,
    profileId: newProfileRef.key,
    nim // <-- Opsional: Kembalikan NIM di respons
  });
};

// Fungsi untuk login user 
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send('Please provide email and password.');
    }

    // First check in profiles (as that's where emails are indexed)
    const profilesRef = db.ref('profiles');
    const profileSnapshot = await profilesRef.orderByChild('email').equalTo(email).once('value');

    if (!profileSnapshot.exists()) {
      return res.status(400).json({ error: 'Email tidak ditemukan' });
    }

    // Get the associated user record
    const profileData = profileSnapshot.val();
    const profileId = Object.keys(profileData)[0];
    const profile = profileData[profileId];
    const userId = profile.userId;

    const usersRef = db.ref('users');
    const userSnapshot = await usersRef.child(userId).once('value');
    const user = userSnapshot.val();

    if (!user) {
      return res.status(400).json({ error: 'User account not found' });
    }

    // Compare hashed password
    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ error: 'Password salah' });
    }

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: userId,
        profileId: profileId,
        username: profile.username,
        email: profile.email,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat login. Silakan coba lagi.' });
  }
};

module.exports = { 
  registerUser, 
  loginUser
};