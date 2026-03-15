const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const uploadToIPFS = async (fileBuffer) => {
    try {
        const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
        const data = new FormData();
        data.append('file', fileBuffer, {
            filename: 'product_image.jpg', // Default filename
            contentType: 'image/jpeg',
        });

        const response = await axios.post(url, data, {
            headers: {
                ...data.getHeaders(),
                'pinata_api_key': process.env.IPFS_API_KEY,
                'pinata_secret_api_key': process.env.IPFS_API_SECRET
            }
        });
        return response.data.IpfsHash;
    } catch (error) {
        console.error('Error uploading to IPFS:', error);
        throw new Error('Failed to upload file to IPFS');
    }
};

module.exports = { uploadToIPFS };
