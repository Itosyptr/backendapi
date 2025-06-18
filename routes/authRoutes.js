const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getProfile, updateProfile } = require('../controller/authController');
const { upload } = require('../utils/cloudinaryConfig');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile/:username', getProfile);
router.put('/profile/:username', upload.single('avatar'), updateProfile);

module.exports = router;