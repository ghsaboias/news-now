# Migration Plan: Python to TypeScript/Next.js

## Current Architecture (Python)
- Discord REST API for message fetching
- Telegram Bot for notifications
- Claude AI for summarization
- File-based JSON storage
- Flask web interface

## Target Architecture (TypeScript/Next.js)
- Next.js as the main application framework
- Initially keep file-based storage, later migrate to database
- Two possible approaches for Discord integration:
  1. Keep current REST API approach
  2. Test discord.js library integration
- Telegram Bot integration using `node-telegram-bot-api` with long polling
- Claude AI integration using Anthropic's TypeScript SDK

## Hardware Constraints
⚠️ Production Environment:
- 1GB RAM DigitalOcean Droplet
- Memory optimization critical
- Need to implement:
  - Proper garbage collection
  - Memory leak prevention
  - Request timeouts
  - Load handling
  - Process manager (PM2) for crash recovery

## Scope Decisions

### 1. Framework Choice
✅ Decided: Next.js
- Provides full-stack capabilities
- Built-in API routes
- TypeScript support out of the box
- Server Components for better performance
- Memory considerations:
  - Use API routes for heavy operations
  - Implement proper cleanup in API handlers
  - Monitor memory usage

### 2. Discord Integration
✅ Decided: Test both approaches
- Start with REST API (current approach)
- Compare with discord.js implementation
- Choose based on implementation experience
- Memory considerations:
  - Implement pagination for message fetching
  - Clean up message data after processing
  - Handle rate limits carefully

### 3. Data Storage
✅ Decided: Phased Approach
- Phase 1: File-based JSON (matching current implementation)
- Phase 2: Database migration (future)
- Memory considerations:
  - Stream file operations
  - Implement cleanup routines
  - Regular garbage collection

### 4. Report Generation
✅ Decided: Simplified First Version
- On-demand reports only
- Remove periodic report generation for initial version
- Can be added later as a separate service
- Memory considerations:
  - Implement request timeouts
  - Clean up report data after sending
  - Handle one report at a time

### 5. Telegram Integration
✅ Decided: Keep Current Approach
- Use long polling
- Maintain existing command structure
- Simplified interface
- Memory considerations:
  - Implement proper error handling
  - Regular bot instance cleanup
  - Monitor webhook/polling memory usage

### 6. Web Interface
✅ Decided: Minimal First Version
- Simple, clean UI
- Basic channel listing
- Report viewing
- No authentication initially
- Memory considerations:
  - Implement pagination
  - Optimize bundle size
  - Lazy loading components

### 7. Deployment
✅ Decided: Keep Current Strategy
- DigitalOcean droplet (1GB RAM)
- Direct deployment
- No containerization for now
- Memory considerations:
  - Use PM2 for process management
  - Implement health checks
  - Set up monitoring
  - Configure proper Node.js memory limits

## Implementation Phases

### Phase 1: Core Functionality
1. [ ] Set up Next.js project with TypeScript
   - Configure memory limits
   - Set up PM2
   - Implement basic monitoring
2. [ ] Implement Discord message fetching
   - With pagination
   - Memory-efficient processing
3. [ ] Set up Claude AI integration
   - Request timeouts
   - Error handling
4. [ ] Basic file operations
   - Streaming implementation
   - Cleanup routines
5. [ ] Simple Telegram bot commands
   - Memory-efficient polling
6. [ ] Minimal web interface
   - Optimized bundle
   - Lazy loading

### Phase 2: Improvements
1. [ ] Choose final Discord integration method
2. [ ] Add error handling
3. [ ] Implement rate limiting
4. [ ] Add basic monitoring
5. [ ] Improve file operations

### Future Considerations
1. Database migration
2. Authentication
3. Periodic reports
4. Advanced features
5. Monitoring and logging

## Next Steps
1. Set up new Next.js project with memory constraints in mind
2. Create basic folder structure
3. Port core types and interfaces
4. Start with Discord integration 