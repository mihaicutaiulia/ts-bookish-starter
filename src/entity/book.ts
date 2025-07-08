export class Book {
    public id: number;
    public title: string;
    public isbn: string;
    public nr_copies: number;

    constructor(id: number, title: string, isbn: string, nr_copies: number) {
        this.id = id;
        this.title = title;
        this.isbn = isbn;
        this.nr_copies = nr_copies;
    }
}
