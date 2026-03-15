const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    walletAddress: {
        type: String,
        required: true,
        unique: true,
    },
    role: {
        type: String,
        enum: ['Manufacturer', 'Distributor', 'Retailer', 'Customer', 'Admin', 'manufacturer', 'distributor', 'retailer', 'customer', 'admin', 'rms'],
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model('User', userSchema);
