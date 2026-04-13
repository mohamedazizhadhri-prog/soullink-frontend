import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        return {
            folder: 'soullink/uploads',
            resource_type: 'auto',
            allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp', 'heic', 'avif', 'mp4', 'webm', 'pdf', 'docx', 'txt'],
        };
    },
});

export const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});
