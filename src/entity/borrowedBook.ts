import { Book } from './book';

export class BorrowedBook extends Book {
    public borrowed_at: Date;
    public due_date: Date;

    constructor(
        id: number,
        title: string,
        isbn: string,
        nr_copies: number,
        author: string | null,
        borrowed_at: Date,
        due_date: Date,
    ) {
        super(id, title, isbn, nr_copies, author);
        this.borrowed_at = borrowed_at;
        this.due_date = due_date;
    }
}
