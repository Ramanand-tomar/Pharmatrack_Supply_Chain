const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const { uploadToIPFS } = require('./utils/ipfs');
const User = require('./models/User');
const ProductRequest = require('./models/ProductRequest');
const MedicineMetadata = require('./models/MedicineMetadata');
const RoleRequest = require('./models/RoleRequest');
const RecallAlert = require('./models/RecallAlert');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Socket.io
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// DB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/supplychain';
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));

// IPFS Upload Route
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const hash = await uploadToIPFS(req.file.buffer);
        res.json({ hash });
    } catch (error) {
        console.error('IPFS upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Manufacturer: Request product creation
app.post('/api/manufacturer/request-product', async (req, res) => {
    try {
        const { manufacturerAddress, ...productData } = req.body;
        const request = new ProductRequest({ ...productData, manufacturerAddress: manufacturerAddress.toLowerCase() });
        await request.save();
        res.status(201).json(request);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Batch Recall Endpoint
app.post('/api/products/recall-batch', async (req, res) => {
    try {
        const { batchNumber, reason, manufacturerAddress } = req.body;
        
        // Save alert to DB
        const alert = new RecallAlert({
            batchNumber,
            reason,
            manufacturerAddress: manufacturerAddress.toLowerCase()
        });
        await alert.save();

        // Broadcast to all connected clients
        io.emit('recall_alert', {
            batchNumber,
            reason,
            manufacturerAddress,
            timestamp: new Date()
        });

        res.status(201).json({ success: true, alert });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Admin: Get pending requests
app.get('/api/admin/requests', async (req, res) => {
    try {
        const requests = await ProductRequest.find({ status: 'pending' });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Approve/Reject requests
app.put('/api/admin/requests/:id/approve', async (req, res) => {
    try {
        const { txHash, onChainId } = req.body;
        const request = await ProductRequest.findByIdAndUpdate(req.params.id, {
            status: 'approved',
            txHash: txHash,
            onChainId: onChainId
        });

        if (request.imageHash && onChainId) {
            const metadata = new MedicineMetadata({ onChainId, imageHash: request.imageHash });
            await metadata.save();
        }
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/admin/requests/:id/reject', async (req, res) => {
    try {
        await ProductRequest.findByIdAndUpdate(req.params.id, { status: 'rejected' });
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Admin: Get all users
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find({}, '-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Role Requests
app.post('/api/role-requests', async (req, res) => {
    try {
        const { userAddress, name, place, requestedRole } = req.body;
        // Check if there's already a pending request
        const existing = await RoleRequest.findOne({ userAddress: userAddress.toLowerCase(), status: 'pending' });
        if (existing) return res.status(400).json({ error: 'You already have a pending request' });

        const request = new RoleRequest({
            userAddress: userAddress.toLowerCase(),
            name,
            place,
            requestedRole
        });
        await request.save();
        res.status(201).json(request);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/admin/role-requests', async (req, res) => {
    try {
        const requests = await RoleRequest.find({ status: 'pending' });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/role-requests/:id/approve', async (req, res) => {
    try {
        await RoleRequest.findByIdAndUpdate(req.params.id, { status: 'approved' });
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/admin/role-requests/:id/reject', async (req, res) => {
    try {
        await RoleRequest.findByIdAndUpdate(req.params.id, { status: 'rejected' });
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Medicine Metadata
app.get('/api/metadata/:onChainId', async (req, res) => {
    try {
        const metadata = await MedicineMetadata.findOne({ onChainId: req.params.onChainId });
        res.json(metadata || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));

