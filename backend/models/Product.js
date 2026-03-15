const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    onChainId: {
        type: Number,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    serialNumber: {
        type: String,
        required: true,
        unique: true
    },
    batchNumber: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String
    },
    manufacturer: {
        type: String, // Wallet address
        required: true
    },
    ipfsHash: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Product', ProductSchema);
