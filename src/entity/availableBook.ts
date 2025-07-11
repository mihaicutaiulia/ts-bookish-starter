export class AvailableBook {
    public id: number;
    public title: string;
    public total_copies: number;
    public available_copies: number;

    constructor(
        id: number,
        title: string,
        total_copies: number,
        available_copies: number,
    ) {
        this.id = id;
        this.title = title;
        this.total_copies = total_copies;
        this.available_copies = available_copies;
    }
}
