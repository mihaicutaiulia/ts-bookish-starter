import { Router, Request, Response } from 'express';
import { Request as TediousRequest, TYPES } from 'tedious';
import { connection } from '../app';

class HealthCheckController {
    router: Router;

    constructor() {
        this.router = Router();
        this.router.get('/', this.check.bind(this));
    }

    check = (req: Request, res: Response): Response => {
        return res.status(200).json({ status: 'OK' });
    };
}

export default new HealthCheckController().router;
