
## Configuration

### Environment Variables
- `DATABASE_URL`: SQLite database path
- `SECRET_KEY`: JWT signing key
- `ALGORITHM`: JWT algorithm (HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration (30)

### Thresholds (configurable in code)
- `HIGH_ENTROPY_THRESHOLD`: 7.5
- `MEDIUM_ENTROPY_THRESHOLD`: 6.0
- `ABT_WINDOW_SIZE`: 60 seconds
- `ABT_BURST_MULTIPLIER`: 3.0

## Security Features

- JWT-based authentication for all endpoints
- Password hashing with bcrypt
- CORS protection for frontend integration
- Input validation and sanitization
- Error handling and logging

## Performance Considerations

- Efficient file sampling (not reading entire files)
- Sliding window algorithm for ABT
- Asynchronous monitoring in separate thread
- Database connection pooling
- Configurable polling intervals

## Integration

The monitoring system integrates seamlessly with:
- FastAPI backend for REST API
- SQLite for data persistence
- React frontend for dashboard
- WebSocket support for real-time updates (next step)
