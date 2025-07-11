import { Router } from 'express';
import { pool } from '../app';
import { Request as TediousRequest, TYPES, Connection } from 'tedious';
import { createHash } from 'node:crypto';
import { User } from '../entity/user';
import { AvailableBook } from '../entity/availableBook';

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

        this.router.get('/users', (req, res) => {
            pool.acquire(async (err, connection) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                try {
                    const users: User[] = await this.getUsers(connection);
                    res.status(201).json(users);
                } catch (err: any) {
                    res.status(500).json({ error: err.message });
                } finally {
                    connection.release();
                }
            });
        });

        this.router.get('/books', (req, res) => {
            pool.acquire(async (err, connection) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                try {
                    const books: AvailableBook[] =
                        await this.getBooksInInventory(connection);
                    res.status(201).json(books);
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

    getUsers(connection: Connection): Promise<User[]> {
        return new Promise((resolve, reject) => {
            const users: User[] = [];
            const query =
                'SELECT id, first_name, last_name, email, created_at FROM users';

            const request = new TediousRequest(query, (err) => {
                if (err) return reject(err);
            });

            request.on('row', (columns) => {
                const user = new User(
                    columns[0].value,
                    columns[1].value,
                    columns[2].value,
                    columns[3].value,
                    columns[4].value,
                );
                users.push(user);
            });

            request.on('requestCompleted', () => resolve(users));
            request.on('error', (err) => reject(err));

            connection.execSql(request);
        });
    }

    getBooksInInventory(connection: Connection): Promise<AvailableBook[]> {
        return new Promise((resolve, reject) => {
            const books: AvailableBook[] = [];
            const query = `SELECT b.id AS book_id, b.title, b.total_copies, i.available_copies
                                                FROM Books b
                                                LEFT JOIN Inventory i ON b.id = i.book_id`;

            const request = new TediousRequest(query, (err) => {
                if (err) return reject(err);
            });

            request.on('row', (columns) => {
                const book = new AvailableBook(
                    columns[0].value,
                    columns[1].value,
                    columns[2].value,
                    columns[3].value,
                );
                books.push(book);
            });

            request.on('requestCompleted', () => resolve(books));
            request.on('error', (err) => reject(err));

            connection.execSql(request);
        });
    }
}

export default new AdminController().router;
