import { Router, Request, Response } from 'express';
import { connection } from '../app';
import { Book } from '../entity/book';
import { Request as TediousRequest, TYPES } from 'tedious';

class BookController {
    router: Router;

    constructor() {
        this.router = Router();
        this.router.get('/:id', this.getBook.bind(this));
        this.router.post('/', this.createBook.bind(this));
    }

    getBook(req: Request, res: Response) {
        const bookId = req.params.id;
        const query = 'SELECT * FROM books WHERE id = @id';

        const request = new TediousRequest(query, (err) => {
            if (err) {
                return res.status(500).json({
                    error: 'server_error',
                    error_description: 'Database query failed.',
                });
            }
        });

        request.addParameter('id', TYPES.Int, bookId);

        request.on('row', (columns) => {
            const book = new Book(
                columns[0].value,
                columns[1].value,
                columns[2].value,
                columns[3].value,
            );
            return res.status(200).json(book);
        });

        connection.execSql(request);
    }

    async createBook(req: Request, res: Response) {
        const { title, isbn, nr_copies, author_first, author_last } = req.body;

        if (!title || !isbn || !nr_copies || !author_first || !author_last) {
            return this.handleError(
                'invalid_request',
                'Missing required fields: title, isbn, nr_copies, or author.',
                res,
            );
        }

        try {
            const bookId = await this.insertBook(req);
            const authorId = await this.insertAuthor(req);

            await this.createBookAuthorRelation(bookId, authorId);

            return res.status(201).json({ id: bookId });
        } catch (err: any) {
            return this.handleError('server_error', err.message, res);
        }
    }

    handleError(message: string, description: string, res: Response) {
        if (!res.headersSent) {
            return res.status(400).json({
                error: message,
                error_description: description,
            });
        }
    }

    insertBook(req: Request): Promise<number> {
        const { title, isbn, nr_copies } = req.body;
        const query =
            'INSERT INTO books (title, isbn, total_copies) OUTPUT INSERTED.id VALUES (@title, @isbn, @nr_copies)';

        return new Promise((resolve, reject) => {
            const request = new TediousRequest(query, (err) => {
                if (err) return reject(err);
            });

            request.addParameter('title', TYPES.NVarChar, title);
            request.addParameter('isbn', TYPES.NVarChar, isbn);
            request.addParameter('nr_copies', TYPES.Int, nr_copies);

            request.on('row', (columns) => {
                resolve(columns[0].value);
            });

            connection.execSql(request);
        });
    }

    insertAuthor(req: Request): Promise<number> {
        const { author_first, author_last } = req.body;
        const checkQuery =
            'SELECT id FROM authors WHERE first_name = @first_name AND last_name = @last_name';

        return new Promise((resolve, reject) => {
            const checkRequest = new TediousRequest(checkQuery, (err) => {
                if (err) return reject(err);
            });

            checkRequest.addParameter('first_name', TYPES.NVarChar, author_first);
            checkRequest.addParameter('last_name', TYPES.NVarChar, author_last);

            let found = false;

            checkRequest.on('row', (columns) => {
                found = true;
                resolve(columns[0].value);
            });

            checkRequest.on('requestCompleted', () => {
                if (!found) {
                    // Insert new author
                    const insertQuery =
                        'INSERT INTO authors (first_name, last_name) OUTPUT INSERTED.id VALUES (@first_name, @last_name)';
                    const insertRequest = new TediousRequest(
                        insertQuery,
                        (err) => {
                            if (err) return reject(err);
                        },
                    );

                    insertRequest.addParameter(
                        'first_name',
                        TYPES.NVarChar,
                        author_first,
                    );
                    insertRequest.addParameter(
                        'last_name',
                        TYPES.NVarChar,
                        author_last,
                    );

                    insertRequest.on('row', (columns) => {
                        resolve(columns[0].value);
                    });

                    connection.execSql(insertRequest);
                }
            });

            connection.execSql(checkRequest);
        });
    }

    createBookAuthorRelation(bookId: number, authorId: number): Promise<void> {
        const query =
            'INSERT INTO BookAuthors (book_id, author_id) VALUES (@bookId, @authId)';

        return new Promise((resolve, reject) => {
            const request = new TediousRequest(query, (err) => {
                if (err) return reject(err);
                resolve();
            });

            request.addParameter('bookId', TYPES.Int, bookId);
            request.addParameter('authId', TYPES.Int, authorId);

            connection.execSql(request);
        });
    }
}

export default new BookController().router;
