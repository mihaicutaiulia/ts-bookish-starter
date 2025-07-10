import { Router, Request, Response } from 'express';
import { pool } from '../app';
import { Book } from '../entity/book';
import { Request as TediousRequest, TYPES, Connection } from 'tedious';

enum BookQueryType {
    ID = 'b.id',
    TITLE = 'b.title',
    AUTHOR = 'a.last_name',
}

class BookController {
    router: Router;

    constructor() {
        this.router = Router();

        this.router.get('/id/:id', (req, res) => {
            pool.acquire((err, connection) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                this.getBooks(req.params.id, BookQueryType.ID, connection)
                    .then((books) => res.json(books))
                    .catch((err) =>
                        res.status(500).json({ error: err.message }),
                    )
                    .finally(() => connection.release());
            });
        });

        this.router.get('/title/:title', (req, res) => {
            pool.acquire((err, connection) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                this.getBooks(req.params.title, BookQueryType.TITLE, connection)
                    .then((books) => res.json(books))
                    .catch((err) =>
                        res.status(500).json({ error: err.message }),
                    )
                    .finally(() => connection.release());
            });
        });

        this.router.get('/author/:author', (req, res) => {
            pool.acquire((err, connection) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                this.getBooks(
                    req.params.author,
                    BookQueryType.AUTHOR,
                    connection,
                )
                    .then((books) => res.json(books))
                    .catch((err) =>
                        res.status(500).json({ error: err.message }),
                    )
                    .finally(() => connection.release());
            });
        });

        this.router.post('/', (req, res) => {
            pool.acquire(async (err, connection) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                try {
                    const bookId = await this.insertBook(req, connection);
                    const authorId = await this.insertAuthor(req, connection);
                    await this.createBookAuthorRelation(
                        bookId,
                        authorId,
                        connection,
                    );
                    res.status(201).json({ id: bookId });
                } catch (err: any) {
                    this.handleError('server_error', err.message, res);
                } finally {
                    connection.release();
                }
            });
        });
    }

    getBooks(
        id: string,
        type: BookQueryType,
        connection: Connection,
    ): Promise<Book[]> {
        return new Promise((resolve, reject) => {
            const books: Book[] = [];
            // const query = 'SELECT * FROM books WHERE id = @id';
            const query = `SELECT b.id AS book_id, b.title, b.isbn,
                                                        b.total_copies, a.last_name, a.first_name
                                                    FROM Books b
                                                    LEFT JOIN BooksAuthors ba ON b.id = ba.book_id
                                                    LEFT JOIN Authors a ON ba.author_id = a.id
                                                    WHERE ${type} = @id`;

            const request = new TediousRequest(query, (err) => {
                if (err) return reject(err);
            });

            if (type === BookQueryType.ID) {
                request.addParameter('id', TYPES.Int, id);
            } else {
                request.addParameter('id', TYPES.NVarChar, id);
            }

            request.on('row', (columns) => {
                const author: string =
                    columns[4].value + ' ' + columns[5].value;
                const book = new Book(
                    columns[0].value,
                    columns[1].value,
                    columns[2].value,
                    columns[3].value,
                    author,
                );
                books.push(book);
            });

            request.on('requestCompleted', () => resolve(books));
            request.on('error', (err) => reject(err));

            connection.execSql(request);
        });
    }

    insertBook(req: Request, connection: Connection): Promise<number> {
        const { title, isbn, nr_copies } = req.body;
        const query = `INSERT INTO books (title, isbn, total_copies)
                                                OUTPUT INSERTED.id
                                                VALUES (@title, @isbn, @nr_copies)`;

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

    insertAuthor(req: Request, connection: Connection): Promise<number> {
        const { author_first, author_last } = req.body;
        const checkQuery = `SELECT id
                                                FROM authors
                                                WHERE first_name = @first_name AND last_name = @last_name`;

        return new Promise((resolve, reject) => {
            const checkRequest = new TediousRequest(checkQuery, (err) => {
                if (err) return reject(err);
            });

            checkRequest.addParameter(
                'first_name',
                TYPES.NVarChar,
                author_first,
            );
            checkRequest.addParameter('last_name', TYPES.NVarChar, author_last);

            let found = false;

            checkRequest.on('row', (columns) => {
                found = true;
                resolve(columns[0].value);
            });

            checkRequest.on('requestCompleted', () => {
                if (!found) {
                    // Insert new author
                    const insertQuery = `INSERT INTO authors (first_name, last_name)
                                                                    OUTPUT INSERTED.id
                                                                    VALUES (@first_name, @last_name)`;
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

    createBookAuthorRelation(
        bookId: number,
        authorId: number,
        connection: Connection,
    ): Promise<void> {
        const query =
            'INSERT INTO BooksAuthors (book_id, author_id) VALUES (@bookId, @authId)';

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

    handleError(message: string, description: string, res: Response) {
        if (!res.headersSent) {
            return res.status(400).json({
                error: message,
                error_description: description,
            });
        }
    }
}

export default new BookController().router;
