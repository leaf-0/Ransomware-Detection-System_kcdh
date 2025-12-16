
## API Endpoints

### Authentication
- `POST /register` - Register a new user
- `POST /token` - Login and get JWT token
- `GET /users/me` - Get current user info (requires auth)

### Data Retrieval
- `GET /alerts` - Get alerts (requires auth)
- `GET /file-events` - Get file events (requires auth)
- `GET /metrics` - Get dashboard metrics (requires auth)

### Data Creation
- `POST /alerts` - Create a new alert (requires auth)
- `POST /file-events` - Create a new file event (requires auth)

## Database Models

- **User**: Authentication and user management
- **Alert**: Ransomware detection alerts with FME and ABT values
- **FileEvent**: File system monitoring events

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS middleware for frontend integration
- Protected endpoints requiring authentication
