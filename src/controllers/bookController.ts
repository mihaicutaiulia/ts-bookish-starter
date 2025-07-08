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

    createBook(req: Request, res: Response) {
        const { title, isbn, nr_copies } = req.body;

        if (!title || !isbn || !nr_copies) {
            return res.status(400).json({
                error: 'invalid_request',
                error_description: 'Missing required fields.',
            });
        }

        const query =
            'INSERT INTO books (title, isbn, total_copies) OUTPUT INSERTED.id VALUES (@title, @isbn, @nr_copies)';
        const request = new TediousRequest(query, (err) => {
            if (err) {
                return res.status(500).json({
                    error: 'server_error',
                    error_description: err,
                });
            }
        });

        request.addParameter('title', TYPES.NVarChar, title);
        request.addParameter('isbn', TYPES.NVarChar, isbn);
        request.addParameter('nr_copies', TYPES.Int, nr_copies);

        request.on('row', (columns) => {
            const bookId = columns[0].value;
            return res.status(201).json({ id: bookId });
        });

        connection.execSql(request);
    }
}

export default new BookController().router;
