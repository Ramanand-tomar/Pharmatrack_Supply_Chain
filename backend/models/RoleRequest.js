const mongoose = require('mongoose');

const roleRequestSchema = new mongoose.Schema({
    userAddress: {
        type: String,
        required: true,
        lowercase: true
    },
    name: {
        type: String,
        required: true
    },
    place: {
        type: String,
        required: true
    },
    requestedRole: {
        type: String,
        required: true,
        enum: ['rms', 'manufacturer', 'distributor', 'retailer']
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.exports = mongoose.model('RoleRequest', roleRequestSchema);
