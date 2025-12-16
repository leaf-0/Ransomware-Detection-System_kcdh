
### Frontend Tests
The frontend includes built-in test data generation and WebSocket connection testing.

## Security Considerations

1. **Production Deployment**:
   - Change default SECRET_KEY
   - Use HTTPS for all connections
   - Implement rate limiting
   - Add input sanitization

2. **File System Access**:
   - Monitor only necessary directories
   - Implement file path validation
   - Add permission checks

3. **Database Security**:
   - Use production-grade database (PostgreSQL)
   - Implement connection pooling
   - Add database encryption

## Performance Optimization

1. **File Monitoring**:
   - Use efficient file sampling
   - Implement ignore patterns
   - Add configurable polling intervals

2. **Database**:
   - Add indexes for common queries
   - Implement connection pooling
   - Use database partitioning for large datasets

3. **Frontend**:
   - Implement virtual scrolling for large datasets
   - Add data caching
   - Optimize WebSocket message handling

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**:
   - Check backend server is running
   - Verify user authentication
   - Check firewall settings

2. **Monitoring Not Working**:
   - Verify directory permissions
   - Check file system access
   - Review monitoring logs

3. **High Memory Usage**:
   - Adjust retention periods
   - Optimize database queries
   - Increase cleanup frequency

### Logs
- Backend logs: Console output
- Monitoring logs: Integrated in backend
- Frontend logs: Browser developer console

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Submit pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create GitHub issue
- Check documentation
- Review test cases
