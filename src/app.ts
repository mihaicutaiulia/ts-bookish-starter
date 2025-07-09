import express from 'express';
import { Connection, Request } from 'tedious';
import 'dotenv/config';
import { Book } from './entity/book';

import { ConnectionPool } from 'tedious-connection-pool';

import healthcheckRoutes from './controllers/healthcheckController';
import bookRoutes from './controllers/bookController';
import userRoutes from './controllers/userController';

// export { connection };
export { pool };

const port = process.env['PORT'] || 3000;

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.listen(port, () => {
    return console.log(`Express is listening at http://localhost:${port}`);
});

/**
 * Primary app routes.
 */
app.use('/healthcheck', healthcheckRoutes);
app.use('/books', bookRoutes);
app.use('/user', userRoutes);

const poolConfig = {
    min: 3,
    max: 5,
    log: true,
};

const connectionConfig = {
    userName: 'user',
    password: 'pass',
    server: 'localhost',
    trustServerCertificate: true,
};

//create the pool
const ConnectionPool = require('tedious-connection-pool');
const pool = new ConnectionPool(poolConfig, connectionConfig);

pool.on('error', function (err) {
    console.error(err);
});

app.get('/', (req, res) => {
    pool.acquire((err, connection) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        getAllBooks(connection)
            .then((books) => res.json(books))
            .catch((err) => res.status(500).json({ error: err.message }))
            .finally(() => connection.release());
    });
});

function getAllBooks(connection: Connection): Promise<Book[]> {
    return new Promise((resolve, reject) => {
        const books: Book[] = [];
        // const sql = 'SELECT id, title, isbn, total_copies FROM Books';
        const sql =
            'SELECT b.id AS book_id, b.title, b.isbn, b.total_copies, a.last_name, a.first_name FROM Books b LEFT JOIN BooksAuthors ba ON b.id = ba.book_id LEFT JOIN Authors a ON ba.author_id = a.id';

        const request = new Request(sql, (err) => {
            if (err) reject(err);
        });

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
