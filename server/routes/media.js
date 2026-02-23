const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { authenticate } = require('../middlewares/auth');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Get all media
router.get('/', authenticate, async (req, res) => {
    res.json({ media: [] });
});

// Upload image with high quality processing
router.post('/upload', authenticate, async (req, res) => {
    try {
        const { base64Data, filename } = req.body;

        if (!base64Data || !filename) {
            return res.status(400).json({ error: 'base64Data and filename are required' });
        }

        // 🔒 SECURITY FIX: Validate file size
        const maxSizeBytes = parseInt(process.env.UPLOAD_MAX_FILE_SIZE || '10485760', 10);
        const estimatedSize = Buffer.byteLength(base64Data, 'base64');
        if (estimatedSize > maxSizeBytes) {
            return res.status(413).json({ error: `File too large. Maximum size: ${maxSizeBytes / 1024 / 1024}MB` });
        }

        // 🔒 SECURITY FIX: Validate filename - prevent path traversal
        const baseName = path.basename(filename, path.extname(filename));
        if (!baseName || baseName.length === 0) {
            return res.status(400).json({ error: 'Invalid filename' });
        }

        // Remove data URL prefix if present
        const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

        // 🔒 SECURITY FIX: Validate base64 format
        if (!/^[A-Za-z0-9+/=]*$/.test(base64)) {
            return res.status(400).json({ error: 'Invalid base64 data' });
        }

        // Generate unique filename - always save as .jpg for consistency
        const timestamp = Date.now();
        const sanitizedName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
        const uniqueFilename = `${timestamp}-${sanitizedName}.jpg`;
        
        // 🔒 SECURITY FIX: Ensure filepath is within uploads directory
        const filePath = path.join(uploadsDir, uniqueFilename);
        const resolvedPath = path.resolve(filePath);
        const resolvedUploadsDir = path.resolve(uploadsDir);
        
        if (!resolvedPath.startsWith(resolvedUploadsDir)) {
            return res.status(400).json({ error: 'Invalid file path' });
        }

        // Convert base64 to buffer
        const buffer = Buffer.from(base64, 'base64');

        // Process image with Sharp for minimal compression - preserve HD quality
        try {
            await sharp(buffer)
                .jpeg({
                    quality: 95,
                    progressive: true,
                    mozjpeg: true
                })
                .toFile(filePath);
        } catch (sharpError) {
            console.error('Sharp processing error:', sharpError);
            // 🔒 SECURITY FIX: Validate buffer size before fallback save
            if (estimatedSize > maxSizeBytes) {
                return res.status(413).json({ error: 'File too large' });
            }
            // Fallback: save original image if Sharp fails
            fs.writeFileSync(filePath, buffer);
        }

        // Return URL
        const imageUrl = `/uploads/${uniqueFilename}`;
        res.json({ url: imageUrl, filename: uniqueFilename });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'File upload failed' });
    }
});

module.exports = router;
