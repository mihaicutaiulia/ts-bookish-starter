import { Request, Response, NextFunction } from 'express';
import { connection } from '../app';
import { Request as TediousRequest, TYPES } from 'tedious';
import bcrypt from 'bcrypt';

export function authenticate(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).json({
            error: 'unauthorized',
            error_description: 'Missing Authorization header.',
        });
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString(
        'ascii',
    );
    const [email, password] = credentials.split(':');

    if (!email || !password) {
        return res.status(401).json({
            error: 'unauthorized',
            error_description: 'Invalid credentials',
        });
    }

    const query = 'SELECT pass_hash FROM users WHERE email = @email';
    const request = new TediousRequest(query, (err) => {
        if (err) {
            return res.status(500).json({
                error: 'server_error',
                error_description: 'Database error.',
            });
        }
    });

    let found = false;
    request.addParameter('email', TYPES.NVarChar, email);

    request.on('row', (columns) => {
        found = true;
        const hash = columns[0].value;

        // currently the password is not hashed in the database, so we cannot compare it
        // bcrypt.compare(password, hash, (err, result) => {
        //     if (result) {
        //         next();
        //     } else {
        //         res.status(401).json({
        //             error: 'unauthorized',
        //             error_description: 'Invalid credentials.',
        //         });
        //     }
        // });

        if (password === hash) {
            next();
        } else {
            res.status(401).json({
                error: 'unauthorized',
                error_description: 'Invalid credentials.',
            });
        }
    });

    request.on('requestCompleted', () => {
        if (!found) {
            res.status(401).json({
                error: 'unauthorized',
                error_description: 'User not found.',
            });
        }
    });

    connection.execSql(request);
}
