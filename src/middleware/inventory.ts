import { Request as TediousRequest, TYPES, Connection } from 'tedious';

export function updateInventoryTable(
    bookId: number,
    nrCopies: number,
    connection: Connection,
): Promise<void> {
    const query = `IF EXISTS (SELECT * FROM Inventory WHERE book_id = @bookId)
                                                BEGIN
                                                    UPDATE Inventory
                                                    SET available_copies = available_copies + @nrCopies
                                                    WHERE book_id = @bookId
                                                END
                                                ELSE
                                                BEGIN
                                                    INSERT INTO Inventory (book_id, available_copies)
                                                    VALUES (@bookId, @nrCopies)
                                                END`;

    return new Promise((resolve, reject) => {
        const request = new TediousRequest(query, (err) => {
            if (err) return reject(err);
            resolve();
        });

        request.addParameter('bookId', TYPES.Int, bookId);
        request.addParameter('nrCopies', TYPES.Int, nrCopies);

        connection.execSql(request);
    });
}

export async function updateInventory(
    bookId: number,
    nrCopies: number,
    connection: Connection,
): Promise<void> {
    await updateInventoryTable(bookId, nrCopies, connection);
    const query = `UPDATE Books
                                                SET total_copies = total_copies + @nrCopies
                                                WHERE id = @bookId`;

    return new Promise((resolve, reject) => {
        const request = new TediousRequest(query, (err) => {
            if (err) return reject(err);
            resolve();
        });

        request.addParameter('bookId', TYPES.Int, bookId);
        request.addParameter('nrCopies', TYPES.Int, nrCopies);

        connection.execSql(request);
    });
}
