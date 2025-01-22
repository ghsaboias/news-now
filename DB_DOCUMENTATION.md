# Database Documentation

## Overview
The database system is implemented using SQLite through the `better-sqlite3` package. It's designed to store and manage information about news sources, messages, and topics from Discord channels.

## Database Schema

### Tables

#### 1. Topics
```sql
CREATE TABLE topics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
- Stores channel-specific topics for message organization
- Each topic represents a specific timeframe of messages from a channel
- Auto-generates creation timestamp

#### 2. Sources
```sql
CREATE TABLE sources (
    id TEXT PRIMARY KEY,
    platform TEXT CHECK(platform IN ('telegram', 'x')) NOT NULL,
    handle TEXT NOT NULL,
    first_seen_at TIMESTAMP NOT NULL,
    last_seen_at TIMESTAMP NOT NULL
);
```
- Tracks news sources (Telegram channels, X/Twitter accounts)
- Maintains first and last seen timestamps
- Enforces platform validation ('telegram' or 'x')

#### 3. Messages
```sql
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    content TEXT NOT NULL,
    embed_title TEXT,
    embed_description TEXT,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (topic_id) REFERENCES topics(id),
    FOREIGN KEY (source_id) REFERENCES sources(id)
);
```
- Stores Discord messages containing news updates
- Links messages to their topics and sources
- Includes embed information and timestamps

#### 4. Message Fields
```sql
CREATE TABLE message_fields (
    message_id TEXT NOT NULL,
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    FOREIGN KEY (message_id) REFERENCES messages(id)
);
```
- Stores additional fields from message embeds
- Flexible key-value structure for embed fields

## Services

### DatabaseService
Located in `src/services/db/index.ts`, this service provides the core database operations:

#### Topic Operations
- `insertTopic(topic)`: Create or update a topic
- `getTopicById(id)`: Retrieve topic by ID
- `getTopicByName(name)`: Find topic by name
- `getAllTopics()`: List all topics

#### Source Operations
- `insertSource(source)`: Create or update a source
- `getSourceByHandle(platform, handle)`: Find source by platform and handle

#### Message Operations
- `insertMessage(message, fields)`: Store message with its fields
- `getMessagesByTopic(topicId, limit)`: Retrieve messages for a topic
- `getMessageFields(messageId)`: Get fields for a message

### MessageProcessor
Located in `src/services/message/processor.ts`, this service handles:
- Processing Discord messages into database records
- Extracting and managing source information
- Batch processing of messages

### SourceExtractor
Located in `src/services/source/extractor.ts`, this service:
- Extracts source information from Discord messages
- Handles source deduplication
- Updates source timestamps

## Integration Flow

1. **Message Reception**
   - Discord messages are received through the Discord API
   - Messages are filtered for FaytuksBot posts

2. **Topic Creation**
   - A new topic is created for each channel/timeframe combination
   - Topic name includes channel ID, timeframe, and timestamp

3. **Message Processing**
   - Messages are processed in batches
   - Source information is extracted and stored/updated
   - Message content and embed information is stored
   - Additional fields are stored separately

4. **Data Relationships**
   - Messages are linked to their topics and sources
   - Sources maintain their history through timestamp updates
   - Fields are associated with their parent messages

## Usage Example

```typescript
// Initialize database
const db = new DatabaseService();
db.initialize();

// Create Discord client with database integration
const client = new DiscordClient(db);

// Process messages from a channel
await client.fetchMessagesInTimeframe(channelId, hours, undefined, topicId);
```

## Error Handling
- Database operations use transactions for data integrity
- Failed message processing is logged but doesn't stop batch processing
- Database connections are properly closed after use

## Future Considerations
- Database indexing for performance optimization
- Data cleanup strategies for old messages
- Monitoring and logging improvements
- Concurrent access handling

## Message Formats and Patterns

### URL Patterns
- Twitter/X: `https://twitter.com/username/status/[id]`
- Telegram: `https://t.me/channelname/[id]`

### Content Structure Variations
1. **Language Support**
   - Messages can contain content in multiple languages (English, Hebrew, Arabic)
   - Channel names and titles may be in different languages
   - Some messages include translations

2. **Message Components**
   - Source URLs (always present)
   - Optional titles/headers
   - Main content body
   - Optional author attributions (e.g., `@username`)
   - Optional emojis and formatting (🚨, hashtags)

3. **Source Categories**
   - News Organizations (e.g., MTVLebanonNews, ALJADEEDNEWS)
   - Government Accounts (e.g., LBpresidency)
   - Individual Journalists/Commentators
   - News Aggregators/Channels
   - Regional News Sources

### Database Handling
- Sources are uniquely identified by platform + handle combination
- First seen and last seen timestamps track source activity
- Messages maintain original formatting and language
- All URLs are preserved in their original form
- Message fields can store additional metadata about the message 

## Message Structure and Relationships

### Message Components
1. **Core Message Data** (messages table)
   - Unique identifier (`id`)
   - Topic reference (`topic_id`)
   - Source reference (`source_id`)
   - Original content (usually URL)
   - Embed information (title and description)
   - Timestamps (message timestamp and creation time)

2. **Message Fields** (message_fields table)
   - One message can have multiple fields
   - Fields store additional metadata:
     - Quotes with attribution
     - Translation information
     - Source URLs
     - Additional context

### Field Types and Examples

1. **Source Fields**
   ```sql
   -- Twitter/X Sources
   message_id | name    | value
   -----------|---------|-----------------------------------------
   msg123     | Source  | https://twitter.com/IDF/status/1882028365013557279
   msg124     | Source  | https://twitter.com/N12News/status/1882036387752657332
   
   -- Channel Information
   message_id | name     | value
   -----------|----------|-----------------------------------------
   msg125     | Channel  | ידיעה ביטחונית - חדשות 🅽🅴🆆🆂
   msg126     | Channel  | Rerum Novarum // Intel, Breaking News, and Alerts
   
   -- Translation and Attribution
   message_id | name              | value
   -----------|-------------------|------------------
   msg127     | Quote from       | IDF Spokesperson
   msg127     | Translated from  | Hebrew
   ```

2. **Channel Title Patterns**
   - Hebrew channels: `ידיעה ביטחונית - חדשות 🅽🅴🆆🆂`
   - English channels: `Rerum Novarum // Intel, Breaking News, and Alerts`
   - Mixed language: `חדשות בטחון מהשטח ללא צנזורה ⭕️`
   - News organizations: `חדשות 301 העולם הערבי`
   - Individual accounts: `עמית סגל`

### Message Processing Details

1. **Message Reception and Validation**
   ```typescript
   class MessageProcessor {
     async processMessage(message: DiscordMessage, topicId: string): Promise<void> {
       // 1. Initial validation
       console.log('Processing message:', { id: message.id, embeds: message.embeds?.length });
       
       // 2. Source extraction
       const source = this.sourceExtractor.extractFromMessage(message);
       if (!source) {
         console.log('No source extracted from message');
         return;
       }
       
       // 3. Message record creation
       const dbMessage = {
         id: uuidv4(),
         topic_id: topicId,
         source_id: source.id,
         content: message.content,
         embed_title: message.embeds[0]?.title || '',
         embed_description: message.embeds[0]?.description || '',
         timestamp: message.timestamp
       };
       
       // 4. Field extraction
       const fields = message.embeds[0]?.fields?.map(field => ({
         message_id: dbMessage.id,
         name: field.name,
         value: field.value
       })) || [];
       
       // 5. Database storage (transactional)
       this.db.insertMessage(dbMessage, fields);
     }
   }
   ```

2. **Field Processing Rules**
   - Source URLs are stored as fields with name "Source"
   - Quotes are stored with attribution in "Quote from" fields
   - Translations are marked with "Translated from" fields
   - Channel information is stored in both message.embed_title and fields
   - All original formatting and emojis are preserved

3. **Database Storage Flow**
   ```sql
   -- Transaction example for message and fields
   BEGIN TRANSACTION;
     -- Insert main message
     INSERT INTO messages (id, topic_id, source_id, content, embed_title, embed_description, timestamp)
     VALUES (@id, @topic_id, @source_id, @content, @embed_title, @embed_description, @timestamp);
     
     -- Insert each field
     INSERT INTO message_fields (message_id, name, value)
     VALUES (@message_id, @name, @value);
   COMMIT;
   ```

4. **Data Integrity Rules**
   - Messages must have a valid topic_id and source_id
   - Fields must reference a valid message_id
   - Timestamps are preserved in UTC format
   - All text content maintains original encoding

## Claude Formatting
Messages are formatted for Claude in the following structure:
```
[Timestamp]
URL
Channel: <embed_title>
Content: <embed_description>
Quote from: <field_value>
[Translated from: <field_value>]
Additional fields: <name>: <value>
``` 