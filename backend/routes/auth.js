const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @route POST api/auth/register
// @desc Register a user
router.post('/register', async (req, res) => {
    const { email, password, walletAddress, role } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'User email already exists' });

        user = await User.findOne({ walletAddress });
        if (user) return res.status(400).json({ msg: 'Wallet address already registered' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            email,
            password: hashedPassword,
            walletAddress,
            role
        });

        await user.save();

        const payload = { user: { id: user.id, role: user.role, walletAddress: user.walletAddress } };
        jwt.sign(payload, process.env.JWT_SECRET || 'secret123', { expiresIn: 360000 }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { email: user.email, role: user.role, walletAddress: user.walletAddress } });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route POST api/auth/login
// @desc Login user and get token
router.post('/login', async (req, res) => {
    const { email, password, walletAddress } = req.body;

    try {
        let user;
        // Allow login by email or wallet address
        if (email) {
            user = await User.findOne({ email });
        } else if (walletAddress) {
            user = await User.findOne({ walletAddress });
        }

        if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

        // If logging in with password
        if (password) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = { user: { id: user.id, role: user.role, walletAddress: user.walletAddress } };
        jwt.sign(payload, process.env.JWT_SECRET || 'secret123', { expiresIn: 360000 }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { email: user.email, role: user.role, walletAddress: user.walletAddress } });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
