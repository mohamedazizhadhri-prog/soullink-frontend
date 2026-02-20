import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        return {
            folder: 'soullink/uploads',
            resource_type: 'auto', // Auto-detect (image, video, raw)
            allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'mp4', 'webm', 'pdf', 'docx', 'txt'],
        };
    },
});

export const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});
