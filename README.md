# Typescript Bookish Starter

## Overview

This repo contains a starter Express server for use in the Bookish bootcamp exercise. Full details of this exercise are on the Swiki page.

## Developer Setup

1. If you haven't already, install Node.js v16.13.0, NPM and NVM. There are instructions for how to do this on Windows (with and without WSL) [here](https://docs.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-overview).
2. Install [VSCode](https://code.visualstudio.com/download) (or another preferred editor). VSCode is recommended unless you have a strong preference otherwise due to its good compatibility with typescript, excellent community extensions and for consistency across all developers when pairing.
3. Install the project dependencies with `npm install`.
4. Run the code!
     - Run in development mode with hot reloading with `npm run dev`
     - Run without hot reloading using `npm start`
     - You can check that the formatting of all files is acceptable using `npm run lint`

# API Routes Documentation

## UserController 

### POST `/borrowBooks`
- **Description:** Allows a user to borrow one or more books by providing their user ID and an array of book titles.
- **Request Body:** `{ "user_id": number, "titles": string[] }`
- **Response:** Success or error message.

### POST `/returnBooks`
- **Description:** Allows a user to return one or more books by providing their user ID and an array of book titles.
- **Request Body:** `{ "user_id": number, "titles": string[] }`
- **Response:** Success or error message.

### GET `/myBooks/:id`
- **Description:** Retrieves all books currently borrowed by the user with the specified ID.
- **URL Param:** `id` (user ID)
- **Response:** Array of borrowed book objects.

---

## AdminController 

### POST `/addUser`
- **Description:** Adds a new user to the system.
- **Request Body:** `{ "first": string, "last": string, "email": string, "pass": string }`
- **Response:** Success message with the new user ID.

### GET `/users`
- **Description:** Retrieves a list of all users.
- **Response:** Array of user objects.

### GET `/books`
- **Description:** Retrieves a list of all books in the inventory, including available copies.
- **Response:** Array of available book objects.

---

## BookController

### GET `/id/:id`
- **Description:** Retrieves book details by book ID.
- **URL Param:** `id` (book ID)
- **Response:** Array with book details.

### GET `/title/:title`
- **Description:** Retrieves book details by title.
- **URL Param:** `title` (book title)
- **Response:** Array with book details.

### GET `/author/:author`
- **Description:** Retrieves books by author last name.
- **URL Param:** `author` (author last name)
- **Response:** Array with book details.

### POST `/add`
- **Description:** Adds a new book and its author to the system, and updates the inventory.
- **Request Body:** `{ "title": string, "isbn": string, "nr_copies": number, "author_first": string, "author_last": string }`
- **Response:** Success message with the new book ID.

### POST `/updateInventory`
- **Description:** Updates the inventory for a specific book by title.
- **Request Body:** `{ "title": string, "nr_copies": number }`
- **Response:** Success message.