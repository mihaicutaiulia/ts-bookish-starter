INSERT INTO Books(title, isbn, total_copies)
VALUES ('The Great Gatsby', '9780743273565', 5),
       ('Tender is the Night', '9780743273565', 7),
       ('1984', '9780451524935', 3),
       ('To Kill a Mockingbird', '9780061120084', 4);

INSERT INTO Authors(first_name, last_name)
VALUES ('F. Scott', 'Fitzgerald'),
       ('George', 'Orwell'),
       ('Harper', 'Lee');

INSERT INTO BooksAuthors(book_id, author_id)
VALUES (1, 1),  -- The Great Gatsby by F. Scott Fitzgerald
       (2, 1),  -- Tender is the Night by F. Scott Fitzgerald
       (3, 2),  -- 1984 by George Orwell
       (4, 3);  -- To Kill a Mockingbird by Harper Lee

SELECT * FROM Books;
SELECT * FROM Authors;
SELECT * FROM BooksAuthors;