import { Router } from 'express';
import { pool } from '../app';
import { Request as TediousRequest, TYPES, Connection } from 'tedious';
import { Book } from '../entity/book';
import { BorrowedBook } from '../entity/borrowedBook';
import { updateInventoryTable } from '../middleware/inventory';

class UserController {
    router: Router;

    constructor() {
        this.router = Router();
        this.router.post('/borrowBooks', (req, res) => {
            pool.acquire(async (err, connection) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                try {
                    const userId = req.body.user_id;
                    const titles: string[] = req.body.titles; // array of book titles

                    const bookIds: number[] = [];
                    for (const title of titles) {
                        const bookId = await this.getBookIdByTitle(
                            title,
                            connection,
                        );
                        bookIds.push(bookId);
                    }
                    for (const bookId of bookIds) {
                        await this.borrowBook(bookId, userId, connection);
                    }

                    res.status(200).json({
                        message: 'Books borrowed successfully',
                    });
                } catch (err: any) {
                    res.status(500).json({ error: err.message });
                } finally {
                    connection.release();
                }
            });
        });

        this.router.post('/returnBooks', (req, res) => {
            pool.acquire(async (err, connection) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                try {
                    const userId = req.body.user_id;
                    const titles: string[] = req.body.titles; // array of book titles

                    const bookIds: number[] = [];
                    for (const title of titles) {
                        const bookId = await this.getBookIdByTitle(
                            title,
                            connection,
                        );
                        bookIds.push(bookId);
                    }
                    for (const bookId of bookIds) {
                        await this.returnBook(bookId, userId, connection);
                    }

                    res.status(200).json({
                        message: 'Books returned successfully',
                    });
                } catch (err: any) {
                    res.status(500).json({ error: err.message });
                } finally {
                    connection.release();
                }
            });
        });

        this.router.get('/myBooks/:id', (req, res) => {
            pool.acquire(async (err, connection) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                try {
                    const userId = req.params.id;
                    const books: BorrowedBook[] =
                        await this.getBorrowedBooksByUserId(userId, connection);
                    res.status(201).json(books);
                } catch (err: any) {
                    res.status(500).json({ error: err.message });
                } finally {
                    connection.release();
                }
            });
        });
    }

    getBookIdByTitle(title: string, connection: Connection): Promise<number> {
        return new Promise((resolve, reject) => {
            let bookId: number;
            // const query = 'SELECT * FROM books WHERE id = @id';
            const query = `SELECT b.id AS book_id, b.title, b.isbn,
                                                        b.total_copies, a.last_name, a.first_name
                                                    FROM Books b
                                                    LEFT JOIN BooksAuthors ba ON b.id = ba.book_id
                                                    LEFT JOIN Authors a ON ba.author_id = a.id
                                                    WHERE b.title = @title`;

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

    async borrowBook(
        bookId: number,
        userId: number,
        connection: Connection,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const borrowed_at = new Date();

            const due_date = new Date(borrowed_at);
            due_date.setDate(due_date.getDate() + 10);

            const query = `INSERT INTO BorrowedBooks (book_id, user_id, borrowed_at, due_date)
                                            OUTPUT INSERTED.id
                                            VALUES (@bookId, @userId, @borrowed_at, @due_date) `;
            const request = new TediousRequest(query, async (err) => {
                if (err) return reject(err);
                try {
                    await updateInventoryTable(bookId, -1, connection);
                    resolve();
                } catch (updateErr) {
                    reject(updateErr);
                }
            });

            request.addParameter('bookId', TYPES.Int, bookId);
            request.addParameter('userId', TYPES.Int, userId);
            request.addParameter('borrowed_at', TYPES.DateTime, borrowed_at);
            request.addParameter('due_date', TYPES.DateTime, due_date);

            connection.execSql(request);
        });
    }

    getBorrowedBooksByUserId(
        userId: string,
        connection: Connection,
    ): Promise<BorrowedBook[]> {
        return new Promise((resolve, reject) => {
            const books: BorrowedBook[] = [];
            // const query = 'SELECT * FROM books WHERE id = @id';
            const query = `SELECT b.id AS book_id, b.title, b.isbn, b.total_copies,
                                                        a.last_name, a.first_name, bb.borrowed_at, bb.due_date
                                                    FROM BorrowedBooks bb
                                                    JOIN Books b ON bb.book_id = b.id
                                                    LEFT JOIN BooksAuthors ba ON b.id = ba.book_id
                                                    LEFT JOIN Authors a ON ba.author_id = a.id
                                                    WHERE bb.user_id = @userId`;

            const request = new TediousRequest(query, (err) => {
                if (err) return reject(err);
            });

            request.addParameter('userId', TYPES.Int, userId);

            request.on('row', (columns) => {
                const author: string =
                    columns[4].value + ' ' + columns[5].value;
                const book = new BorrowedBook(
                    columns[0].value,
                    columns[1].value,
                    columns[2].value,
                    columns[3].value,
                    author,
                    columns[6].value,
                    columns[7].value,
                );
                books.push(book);
            });

            request.on('requestCompleted', () => resolve(books));
            request.on('error', (err) => reject(err));

            connection.execSql(request);
        });
    }

    async returnBook(
        bookId: number,
        userId: number,
        connection: Connection,
    ): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const query = `DELETE FROM BorrowedBooks
                           WHERE book_id = @bookId AND user_id = @userId`;
            const request = new TediousRequest(query, async (err) => {
                if (err) return reject(err);
                try {
                    await updateInventoryTable(bookId, +1, connection);
                    resolve();
                } catch (updateErr) {
                    reject(updateErr);
                }
            });

            request.addParameter('bookId', TYPES.Int, bookId);
            request.addParameter('userId', TYPES.Int, userId);

            connection.execSql(request);
        });
    }
}

export default new UserController().router;
