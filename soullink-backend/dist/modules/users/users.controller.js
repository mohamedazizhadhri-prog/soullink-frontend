import { UsersService } from './users.service.js';
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
    async getProfile(req, res, next) {
        try {
            const user = await usersService.getProfile(req.params.handle);
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
