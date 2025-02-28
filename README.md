# FinPost

## Overview
FinPost is a lightweight blogging platform designed for users to share financial discussions and insights. It allows users to register, log in, create, edit, and delete posts. The platform ensures secure user authentication with JWT, stores user data and posts using SQLite, and employs EJS for dynamic rendering.

## Features
- User registration and authentication (JWT-based)
- Secure password hashing with bcrypt
- CRUD operations for blog posts
- Markdown support for rich-text formatting
- Sanitization of user inputs for security
- Role-based permissions for post editing and deletion
- SQLite database for lightweight storage

## Installation & Setup
```sh
# Clone the repository
git clone https://github.com/Harish-Shadow/FinPost.git
cd FinPost

# Install dependencies
npm install

# Create an environment file and configure the secret key
echo "JWTSECRET=your_secret_key" > .env

# Start the server
node server.js
```

## Project Structure
```
FinPost/
├── views/               # EJS templates
│   ├── index.ejs        # Home page
│   ├── login.ejs        # Login page
│   ├── register.ejs     # Registration page
│   ├── dashboard.ejs    # User dashboard
│   ├── single-posts.ejs # Post detail view
│   ├── create-post.ejs  # Post creation page
├── public/              # Static assets (CSS, JS, images)
├── server.js            # Main server file
├── database.db          # SQLite database
├── package.json         # Dependencies and scripts
└── .env                 # Environment variables
```

## Technologies Used
- **Backend**: Node.js, Express.js
- **Frontend**: EJS, Bootstrap
- **Database**: SQLite with better-sqlite3
- **Authentication**: JSON Web Tokens (JWT), bcrypt

## API Routes
| Method | Route                 | Description |
|--------|----------------------|-------------|
| GET    | `/`                  | Home page |
| GET    | `/login`             | Login page |
| POST   | `/login`             | Authenticate user |
| GET    | `/register`          | Registration page |
| POST   | `/register`          | Create new user |
| GET    | `/dashboard`         | User dashboard |
| GET    | `/posts/:id`         | View a single post |
| GET    | `/create-post`       | Post creation form |
| POST   | `/create-post`       | Submit a new post |
| GET    | `/edit-post/:id`     | Edit post form |
| POST   | `/update-post/:id`   | Update an existing post |
| POST   | `/delete-post/:id`   | Delete a post |

## Security Measures
- **Password hashing**: All passwords are securely hashed before storing.
- **Input sanitization**: Prevents XSS and SQL injection attacks.
- **JWT authentication**: Protects user sessions.
- **Role-based access control**: Ensures only post authors can modify or delete their content.

## License
This project is open-source and available under the MIT License.
