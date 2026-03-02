import { UsersService } from './users.service.js';
import { AppError } from '../../middleware/errorHandler.js';
const usersService = new UsersService();
export class UsersController {
    async getMe(req, res, next) {
        try {
            const user = await usersService.getMe(req.user.id);
            res.status(200).json({ status: 'success', data: { user } });
        }
        catch (error) {
            next(error);
        }
    }
    async updateMe(req, res, next) {
        try {
            const user = await usersService.updateMe(req.user.id, req.body);
            res.status(200).json({ status: 'success', data: { user } });
        }
        catch (error) {
            next(error);
        }
    }
    async updateAvatar(req, res, next) {
        try {
            console.log('UpdateAvatar request received');
            if (!req.file) {
                console.log('No file in request');
                return next(new AppError(400, 'Please upload an image'));
            }
            console.log('File received:', {
                fieldname: req.file.fieldname,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                path: req.file.path,
                size: req.file.size
            });
            const avatarUrl = req.file.path; // Cloudinary URL
            if (!avatarUrl) {
                console.error('Cloudinary did not return a path/URL');
                return next(new AppError(500, 'Failed to upload image to Cloudinary'));
            }
            const user = await usersService.updateMe(req.user.id, { avatarUrl });
            res.status(200).json({ status: 'success', data: { user } });
        }
        catch (error) {
            console.error('Error in updateAvatar:', error);
            next(error);
        }
    }
    async getProfile(req, res, next) {
        try {
            const handle = Array.isArray(req.params.handle) ? req.params.handle[0] : req.params.handle;
            const user = await usersService.getProfile(handle);
            res.status(200).json({ status: 'success', data: { user } });
        }
        catch (error) {
            next(error);
        }
    }
    async search(req, res, next) {
        try {
            const query = typeof req.query.q === 'string' ? req.query.q : '';
            const users = await usersService.searchUsers(query);
            res.status(200).json({ status: 'success', data: { users } });
        }
        catch (error) {
            next(error);
        }
    }
}
