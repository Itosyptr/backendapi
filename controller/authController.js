const { db } = require('../config/firebase');
require('dotenv').config();
require('firebase/auth');
const {
  hashPassword,
  comparePassword,
  validatePasswordStrength
} = require('../utils/authHelper');
const { getCurrentTimestamp } = require('../utils/datetimeHelper');
const { uploadToCloudinary } = require('../utils/cloudinaryConfig');

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
    nim 
  });
};

// Fungsi untuk login user 
const loginUser = async (req, res) => {
  try {
    const { username , password } = req.body;

    if (!username || !password) {
      return res.status(400).send('Please provide username and password.');
    }

    const profilesRef = db.ref('profiles');
    const profileSnapshot = await profilesRef.orderByChild('username').equalTo(username).once('value');

    if (!profileSnapshot.exists()) {
      return res.status(400).json({ error: 'Username tidak ditemukan' });
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

// Function to get user profile by username
const getProfile = async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const profilesRef = db.ref('profiles');
    const profileSnapshot = await profilesRef
      .orderByChild('username')
      .equalTo(username)
      .once('value');

    if (!profileSnapshot.exists()) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profiles = profileSnapshot.val();
    const profileData = Object.values(profiles)[0];
    
    res.status(200).json({
      profile: {
        username: profileData.username,
        email: profileData.email,
        nim: profileData.nim,
        avatarUrl: profileData.avatarUrl,
        createdAt: profileData.createdAt,
        updatedAt: profileData.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile data' });
  }
};

// Function to update user profile
const updateProfile = async (req, res) => {
  try {
    const { username: currentUsername } = req.params;
    const { username: newUsername, nim } = req.body;
    const timestamp = getCurrentTimestamp();
    const updates = {};

    // Handle normal profile updates
    if (newUsername || nim) {
      if (newUsername) updates.username = newUsername;
      if (nim) {
        if (!/^\d+$/.test(nim)) {
          return res.status(400).json({ error: 'NIM harus berupa angka' });
        }
        updates.nim = nim;
      }
    }

    // Handle avatar upload if file is present
    if (req.file) {
      const cloudinaryResponse = await uploadToCloudinary(req.file.buffer);
      updates.avatarUrl = cloudinaryResponse.secure_url;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Provide at least username, NIM, or avatar to update' });
    }

    // Check if new username already exists
    if (newUsername && newUsername !== currentUsername) {
      const usernameCheck = await db.ref('profiles')
        .orderByChild('username')
        .equalTo(newUsername)
        .once('value');

      if (usernameCheck.exists()) {
        return res.status(400).json({ error: 'Username baru sudah digunakan' });
      }
    }

    // Find and update profile
    const profilesRef = db.ref('profiles');
    const profileSnapshot = await profilesRef
      .orderByChild('username')
      .equalTo(currentUsername)
      .once('value');

    if (!profileSnapshot.exists()) {
      return res.status(404).json({ error: 'Profile tidak ditemukan' });
    }

    const profiles = profileSnapshot.val();
    const profileKey = Object.keys(profiles)[0];
    const profile = profiles[profileKey];

    // Add updatedAt timestamp
    updates.updatedAt = timestamp;

    // Update profile
    await profilesRef.child(profileKey).update(updates);

    // If username is updated, also update it in users collection
    if (newUsername) {
      await db.ref('users').child(profile.userId).update({
        username: newUsername,
        updatedAt: timestamp
      });
    }

    // Get updated profile data
    const updatedSnapshot = await profilesRef.child(profileKey).once('value');
    const updatedProfile = updatedSnapshot.val();

    res.status(200).json({
      message: 'Profile berhasil diperbarui',
      profile: {
        username: updatedProfile.username,
        nim: updatedProfile.nim,
        avatarUrl: updatedProfile.avatarUrl,
        updatedAt: updatedProfile.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Gagal memperbarui profile' });
  }
};

module.exports = { 
  registerUser, 
  loginUser,
  getProfile,
  updateProfile
};
