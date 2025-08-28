# Vector Embeddings Implementation for AI Chat Memory

This implementation adds advanced vector embeddings using pgvector in Supabase to create a memory system for your AI chatbot. The system uses sentence-transformers/all-mpnet-base-v2 model from Hugging Face for generating 768-dimensional embeddings.

## 🌟 Features

- **Chat Memory**: Remembers previous conversations and provides contextual responses
- **Semantic Search**: Finds relevant information from chat history and documents
- **Document Intelligence**: Creates embeddings for uploaded documents for better context
- **Cross-chat Context**: Can reference information from other conversations
- **Fallback System**: Works even without Hugging Face API key using deterministic embeddings

## 🏗️ Architecture

### Database Schema
- **chat_embeddings**: Stores embeddings for chat messages (user & assistant)
- **document_embeddings**: Stores embeddings for document chunks
- **user_sessions**: Tracks conversation sessions
- **Vector Indexes**: Optimized for fast similarity search using pgvector

### Services
- **EmbeddingService**: Generates embeddings using Hugging Face API or fallback
- **VectorSearchService**: Handles similarity search and context building
- **Integrated Chat**: Updated chat system with memory capabilities

## 📋 Prerequisites

1. **Supabase Project** with PostgreSQL database
2. **pgvector Extension** enabled in Supabase
3. **Hugging Face API Key** (optional but recommended)

## 🚀 Setup Instructions

### 1. Database Setup

#### Enable pgvector in Supabase:
1. Go to your Supabase project dashboard
2. Navigate to Settings → Database
3. Run this SQL query in the SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

#### Run the migration:
Execute the migration file:
1. `supabase/migrations/20250128000000_enable_vector_embeddings.sql`

**Note:** This migration works with your existing database schema (users, chats, chat_messages, documents tables).

### 2. Environment Variables

Add to your `.env` file:

```env
# Required - Your existing Supabase credentials
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key

# Optional - Hugging Face API key for better embeddings
VITE_HUGGINGFACE_API_KEY=your_huggingface_api_key
```

To get a Hugging Face API key:
1. Sign up at https://huggingface.co/
2. Go to Settings → Access Tokens
3. Create a new token with "Read" permissions

### 3. Install Dependencies

```bash
npm install
# or
yarn install
```

The system will automatically use the new axios dependency for API calls.

### 4. Configure Supabase Policies

The migrations automatically set up Row Level Security (RLS) policies, but verify these are active:

- Users can only access their own chat embeddings
- Users can only access their own document embeddings
- Proper cascade deletes are configured

## 🎯 How It Works

### 1. Chat Memory System

When you send a message:
1. **Context Building**: Searches for similar conversations and relevant documents
2. **AI Processing**: Sends enriched context to Gemini AI
3. **Storage**: Stores both user message and AI response as embeddings
4. **Future Context**: These embeddings are used for future conversations

### 2. Example Usage Scenarios

**Scenario 1: Continued Programming Discussion**
```
User: "Write a Python function for fibonacci"
AI: "Here's a Python fibonacci function..." [stores embedding]

User: "Now convert it to Java"
AI: "Based on the Python fibonacci function I wrote earlier, here's the Java version..." [uses stored context]
```

**Scenario 2: Document-Based Learning**
```
User uploads a React documentation PDF
User: "How do I use useEffect?"
AI: "According to your uploaded React documentation..." [uses document embeddings]
```

### 3. Technical Flow

```
User Message
    ↓
Generate Embedding (768d vector)
    ↓
Search Similar Messages (pgvector cosine similarity)
    ↓
Search Relevant Documents (pgvector cosine similarity)
    ↓
Build Context (recent + similar + documents)
    ↓
Send to Gemini AI
    ↓
Store Response Embedding
    ↓
Return Contextual Response
```

## 🔧 Configuration Options

### Similarity Thresholds
Adjust in `src/lib/vectorSearch.ts`:

```typescript
// Chat message similarity (0.6 = 60% similar)
similarity_threshold: 0.6,

// Document relevance (0.7 = 70% relevant)  
similarity_threshold: 0.7,
```

### Context Limits
Configure how much context to include:

```typescript
// Recent messages from current chat
this.getRecentChatHistory(chatId, userId, 5),

// Similar conversations from other chats
this.findSimilarChatMessages(query, userId, undefined, 3),

// Relevant document chunks
this.findSimilarDocuments(query, userId, 3)
```

### Embedding Model
The system uses `sentence-transformers/all-mpnet-base-v2` which provides:
- **768 dimensions**
- **Good performance** on semantic similarity tasks
- **Free to use** via Hugging Face API
- **Fallback support** when API is unavailable

## 📊 Performance Optimizations

### Database Indexes
- Vector indexes using IVFFlat algorithm
- Standard B-tree indexes on foreign keys
- Optimized for queries with user filtering

### Chunking Strategy
- Documents are split into ~400 word chunks
- Overlapping context to maintain meaning
- Smart chunking preserves sentence boundaries

### Caching
- Embeddings are stored permanently
- Only generate once per message/document
- Async processing doesn't block UI

## 🔍 Monitoring & Debugging

### Check Embedding Generation
```javascript
// In browser console
console.log('Vector search service:', vectorSearchService);

// Check if embeddings are being generated
vectorSearchService.buildChatContext("test query", userId, chatId)
  .then(context => console.log('Context:', context));
```

### Database Queries
Monitor in Supabase dashboard:
```sql
-- Check embeddings count
SELECT COUNT(*) FROM chat_embeddings WHERE user_id = 'your-user-id';

-- Check recent embeddings
SELECT content, created_at FROM chat_embeddings 
WHERE user_id = 'your-user-id' 
ORDER BY created_at DESC LIMIT 10;
```

## 🚨 Troubleshooting

### Common Issues

**1. "Function search_similar_chat_messages does not exist"**
- Solution: Run the vector embeddings migration

**2. "Extension vector does not exist"**  
- Solution: Enable pgvector extension in Supabase

**3. "Hugging Face API rate limits"**
- Solution: System automatically falls back to deterministic embeddings

**4. "Embeddings not improving responses"**
- Check similarity thresholds are not too high
- Verify embeddings are being generated (check database)
- Ensure sufficient conversation history exists

### Performance Issues
- If queries are slow, check vector indexes exist
- Consider reducing similarity search limits
- Monitor Supabase database performance

## 🎨 Customization

### Custom Embedding Models
To use different models, update `src/services/embeddings.ts`:

```typescript
const HF_API_URL = 'https://api-inference.huggingface.co/pipeline/feature-extraction/your-model';
```

### Different Similarity Metrics
pgvector supports multiple distance functions:
- `<=>` (cosine distance - default)
- `<->` (L2 distance)  
- `<#>` (inner product)

### Context Formatting
Customize how context appears in prompts by modifying `formatContextForPrompt()` in `vectorSearch.ts`.

## 📈 Results

With this implementation, your AI chatbot will:

✅ **Remember previous conversations**  
✅ **Provide contextual responses**  
✅ **Reference uploaded documents**  
✅ **Maintain conversation continuity**  
✅ **Scale efficiently with vector indexes**  

The system transforms your chatbot from a stateless Q&A tool into an intelligent assistant with perfect memory and contextual understanding.

## 🤝 Contributing

To extend this system:

1. **Add more embedding models** in `embeddingService`
2. **Implement semantic caching** for common queries  
3. **Add embedding visualization** for debugging
4. **Create embedding quality metrics**

## 📝 License

This implementation is part of your AI Study Platform project. Make sure to comply with:
- Hugging Face model licenses
- Supabase terms of service
- OpenAI/Gemini API terms

---

**Happy coding! 🚀** Your AI chatbot now has a perfect memory system that will make conversations much more intelligent and contextual.
