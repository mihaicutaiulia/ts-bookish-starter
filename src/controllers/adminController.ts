import { Router } from 'express';
import { pool } from '../app';
import { Request as TediousRequest, TYPES, Connection } from 'tedious';
import { createHash } from 'node:crypto';

class AdminController {
    router: Router;

    constructor() {
        this.router = Router();
        this.router.post('/addUser', (req, res) => {
            pool.acquire(async (err, connection) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                try {
                    const userData = req.body;
                    const userId = await this.addUser(userData, connection);

                    res.status(200).json({
                        message:
                            'User with ID ' + userId + ' created successfully',
                    });
                } catch (err: any) {
                    res.status(500).json({ error: err.message });
                } finally {
                    connection.release();
                }
            });
        });
    }

    addUser(userData, connection: Connection): Promise<void> {
        const { first, last, email, pass } = userData;
        const created_at = new Date();

        const passHash = createHash('sha256').update(pass).digest('hex');

        const query = `INSERT INTO users (first_name, last_name, email, pass_hash, created_at)
                                                OUTPUT INSERTED.id
                                                VALUES (@first, @last, @email, @pass, @created_at)`;

        return new Promise((resolve, reject) => {
            const request = new TediousRequest(query, (err) => {
                if (err) return reject(err);
            });

            request.addParameter('first', TYPES.NVarChar, first);
            request.addParameter('last', TYPES.NVarChar, last);
            request.addParameter('email', TYPES.NVarChar, email);
            request.addParameter('pass', TYPES.NVarChar, passHash);
            request.addParameter('created_at', TYPES.DateTime, created_at);

            request.on('row', (columns) => {
                resolve(columns[0].value);
            });

            connection.execSql(request);
        });
    }
}

export default new AdminController().router;
