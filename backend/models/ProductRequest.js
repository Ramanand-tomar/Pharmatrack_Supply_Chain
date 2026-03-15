const mongoose = require('mongoose');

const productRequestSchema = new mongoose.Schema({
  manufacturerAddress: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  batchNumber: { type: String, required: true },
  manufacturingDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  onChainId: { type: Number }, 
  imageHash: { type: String },
  txHash: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ProductRequest', productRequestSchema);
