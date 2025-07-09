import { Router } from 'express';
import { pool } from '../app';
import { Request as TediousRequest, TYPES, Connection } from 'tedious';

class UserController {
    router: Router;

    constructor() {
        this.router = Router();
        this.router.post('/borrowBook', (req, res) => {
            pool.acquire(async (err, connection) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                try {
                    const bookId = await this.getBookIdByTitle(req.body.title, connection);
                    const userId = req.body.userId;
                    await this.borrowBook(bookId, userId, connection);

                    res.status(200).json({
                        message: 'Book borrowed successfully',
                    });
                } catch (err: any) {
                    res.status(500).json({ error: err.message });
                } finally {
                    connection.release();
                }
            });
        });
        this.router.get('/myBooks', (req, res) => {
            res.status(200).json({ message: 'User endpoint is working' });
        });
    }

    getBookIdByTitle(title: string, connection: Connection): Promise<number> {
        return new Promise((resolve, reject) => {
            let bookId: number;
            // const query = 'SELECT * FROM books WHERE id = @id';
            const query =
                'SELECT b.id AS book_id, b.title, b.isbn, b.total_copies, a.last_name, a.first_name FROM Books b LEFT JOIN BooksAuthors ba ON b.id = ba.book_id LEFT JOIN Authors a ON ba.author_id = a.id WHERE b.title = @title';

            const request = new TediousRequest(query, (err) => {
                if (err) return reject(err);
            });

            request.addParameter('title', TYPES.NVarChar, title);

            request.on('row', (columns) => {
                bookId = columns[0].value;
            });

            request.on('requestCompleted', () => resolve(bookId));
            request.on('error', (err) => reject(err));

            connection.execSql(request);
        });
    }

    borrowBook(
        bookId: number,
        userId: number,
        connection: Connection,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const borrowed_at = new Date();

            const due_date = new Date(borrowed_at);
            due_date.setDate(due_date.getDate() + 10);

            const query =
                'INSERT INTO BorrowedBooks (book_id, user_id, borrowed_at, due_date) OUTPUT INSERTED.id VALUES (@bookId, @userId, @borrowed_at, @due_date)';
            const request = new TediousRequest(query, (err) => {
                if (err) return reject(err);
            });

            request.addParameter('bookId', TYPES.Int, bookId);
            request.addParameter('userId', TYPES.Int, userId);
            request.addParameter('borrowed_at', TYPES.DateTime, borrowed_at);
            request.addParameter('due_date', TYPES.DateTime, due_date);

            request.on('row', (columns) => {
                resolve(columns[0].value);
            });

            connection.execSql(request);
        });
    }
}

export default new UserController().router;
