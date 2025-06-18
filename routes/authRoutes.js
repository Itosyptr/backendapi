const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getProfile } = require('../controller/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile/:username', getProfile);

module.exports = router;
