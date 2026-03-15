const mongoose = require('mongoose');

const medicineMetadataSchema = new mongoose.Schema({
  onChainId: { type: Number, required: true, unique: true },
  imageHash: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MedicineMetadata', medicineMetadataSchema);
