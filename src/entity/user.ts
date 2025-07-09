export class User {
    public id: number;
    public first_name: string;
    public last_name: string;
    public email: string;
    public pass_hash: string;
    public created_at: Date;

    constructor(
        id: number,
        first_name: string,
        last_name: string,
        email: string,
        pass_hash: string,
        created_at: Date,
    ) {
        this.id = id;
        this.first_name = first_name;
        this.last_name = last_name;
        this.email = email;
        this.pass_hash = pass_hash;
        this.created_at = created_at;
    }
}