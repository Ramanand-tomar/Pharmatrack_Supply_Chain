const mongoose = require('mongoose');

const RecallAlertSchema = new mongoose.Schema({
    batchNumber: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    manufacturerAddress: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('RecallAlert', RecallAlertSchema);
