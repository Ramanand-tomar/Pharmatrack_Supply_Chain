const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Product = require('../models/Product');
const { uploadToIPFS } = require('../utils/ipfs');

// @route   POST api/products
// @desc    Add product off-chain metadata
// @access  Private (Manufacturer only)
router.post('/', auth, async (req, res) => {
    if (req.user.role !== 'Manufacturer') {
        return res.status(403).json({ msg: 'Only manufacturers can add products' });
    }

    const { onChainId, name, description, serialNumber, batchNumber, imageUrl } = req.body;

    try {
        let product = await Product.findOne({ onChainId });
        if (product) return res.status(400).json({ msg: 'Product already exists' });

        // Upload metadata to IPFS
        let ipfsHash = '';
        try {
            ipfsHash = await uploadToIPFS({
                onChainId,
                name,
                description,
                serialNumber,
                batchNumber,
                manufacturer: req.user.walletAddress,
                timestamp: new Date().toISOString()
            });
        } catch (ipfsErr) {
            console.error('IPFS upload failed, continuing with DB save only', ipfsErr);
        }

        product = new Product({
            onChainId,
            name,
            description,
            serialNumber,
            batchNumber,
            imageUrl,
            manufacturer: req.user.walletAddress,
            ipfsHash
        });

        await product.save();
        res.json(product);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/products
// @desc    Get all products metadata
// @access  Public
router.get('/', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/products/:id
// @desc    Get product metadata by on-chain ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findOne({ onChainId: req.params.id });
        if (!product) return res.status(404).json({ msg: 'Product not found' });
        res.json(product);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
