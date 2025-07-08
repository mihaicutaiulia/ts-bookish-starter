import express from 'express';
import { Connection, ConnectionConfiguration, Request } from 'tedious';
import 'dotenv/config';
import { Book } from './entity/book';

import healthcheckRoutes from './controllers/healthcheckController';
import bookRoutes from './controllers/bookController';

const port = process.env['PORT'] || 3000;

const app = express();
app.use(express.urlencoded({ extended: true }));
app.listen(port, () => {
    return console.log(`Express is listening at http://localhost:${port}`);
});

/**
 * Primary app routes.
 */
app.use('/healthcheck', healthcheckRoutes);
app.use('/books', bookRoutes);

const config: ConnectionConfiguration = {
    server: 'localhost',
    options: {
        trustServerCertificate: true,
    },
    authentication: {
        type: 'default',
        options: {
            userName: 'user',
            password: 'pass',
        },
    },
};

const connection = new Connection(config);

connection.on('connect', (err) => {
    if (err) {
        console.error('Connection failed:', err);
    } else {
        console.log('Connected to the database successfully.');
    }
});

connection.connect();

app.get('/', async (req, res) => {
    try {
        const books = await getAllBooks(connection);
        res.json(books);
    } catch (err) {
        res.status(500).json({ error: err });
    }
});

function getAllBooks(connection: Connection): Promise<Book[]> {
    return new Promise((resolve, reject) => {
        const books: Book[] = [];
        const sql = 'SELECT id, title, isbn, total_copies FROM Books';

        const request = new Request(sql, (err) => {
            if (err) reject(err);
        });

        request.on('row', (columns) => {
            const book = new Book(
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
