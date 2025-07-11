IF OBJECT_ID('BorrowedBooks') IS NOT NULL
    DROP TABLE BorrowedBooks;

IF OBJECT_ID('BooksAuthors') IS NOT NULL
    DROP TABLE BooksAuthors;

IF OBJECT_ID('Users') IS NOT NULL
    DROP TABLE Users;

IF OBJECT_ID('Books') IS NOT NULL
    DROP TABLE Books;

IF OBJECT_ID('Authors') IS NOT NULL
    DROP TABLE Authors;

CREATE TABLE Users (
    id INT PRIMARY KEY IDENTITY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100) UNIQUE NOT NULL,
    pass_hash VARCHAR(255) UNIQUE NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE Books (
    id INT PRIMARY KEY IDENTITY,
    title VARCHAR(255) NOT NULL,
    isbn VARCHAR(13) UNIQUE NOT NULL,
    total_copies INT NOT NULL CHECK (total_copies >= 0),
);

CREATE TABLE Authors (
    id INT PRIMARY KEY IDENTITY,
    first_name VARCHAR(50),
    last_name VARCHAR(50)
);

CREATE TABLE BooksAuthors (
    book_id INT NOT NULL,
    author_id INT NOT NULL,
    FOREIGN KEY (book_id) REFERENCES Books(id),
    FOREIGN KEY (author_id) REFERENCES Authors(id)
);

CREATE TABLE BorrowedBooks (
    id INT PRIMARY KEY IDENTITY,
    book_id INT NOT NULL,
    user_id INT NOT NULL,
    borrowed_at DATETIME DEFAULT GETDATE(),
    due_date DATETIME NOT NULL,
    FOREIGN KEY (book_id) REFERENCES Books(id),
    FOREIGN KEY (user_id) REFERENCES Users(id)
);

CREATE TABLE Inventory (
    book_id INT PRIMARY KEY,
    available_copies INT NOT NULL CHECK (available_copies >= 0),
    FOREIGN KEY (book_id) REFERENCES Books(id)
);