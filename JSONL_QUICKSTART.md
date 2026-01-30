# JSONL Dataset Generation - Quick Start Guide

## What Was Implemented

A complete FastAPI backend service that generates JSONL training datasets from uploaded documents for LLM fine-tuning.

### Architecture Flow

```
User uploads document (DOCX, PPTX, TXT, MD)
        ↓
Frontend uploads FILE to Supabase Storage "documents" bucket
        ↓
Frontend does existing work (embeddings etc.) — UNCHANGED
        ↓
User clicks "Generate JSONL" button (database icon)
        ↓
FastAPI backend:
   - Downloads file from storage bucket
   - Extracts text server-side (PDF, DOCX, PPTX, TXT)
   - Chunks text into ~800 character segments
   - Calls OpenRouter LLM for each chunk
   - Generates 3-5 JSONL training examples per chunk
   - Uploads final JSONL to storage
        ↓
User downloads JSONL file for fine-tuning
```

---

## Quick Start (5 minutes)

### Step 1: Database Setup

Run the migration in Supabase SQL Editor:

```sql
-- Copy and paste content from:
supabase/migrations/20260115_add_jsonl_tracking.sql
```

Then run storage setup:

```sql
-- Copy and paste content from:
supabase/storage_setup.sql
```

### Step 2: Backend Setup

```bash
# Navigate to backend
cd fastapi-backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your credentials:
#   - SUPABASE_URL
#   - SUPABASE_SERVICE_KEY
#   - OPENROUTER_API_KEY
```

### Step 3: Start Backend

```bash
python main.py
```

Backend runs at `http://localhost:8000`

### Step 4: Frontend Configuration

Add to your `.env` file:

```bash
VITE_FASTAPI_URL=http://localhost:8000
```

Restart your frontend dev server.

### Step 5: Test It Out

1. Upload a document (DOCX, PPTX, TXT, MD) via the Documents page
2. Click the green database icon next to the document
3. Wait for generation (status shows "Generating..." with spinner)
4. When complete, click the blue download icon
5. JSONL file downloads automatically

---

## File Structure Created

```
fastapi-backend/
├── main.py                          # FastAPI app entry point
├── requirements.txt                 # Python dependencies
├── .env.example                     # Environment template
├── .gitignore                       # Git ignore rules
├── README.md                        # Full documentation
├── app/
│   ├── __init__.py
│   ├── api/
│   │   ├── __init__.py
│   │   └── jsonl.py                 # API endpoints
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py               # Pydantic models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── chunker.py               # Text chunking
│   │   ├── document_loader.py       # File download & extraction
│   │   ├── job_manager.py           # Background job orchestration
│   │   ├── llm_client.py            # OpenRouter API client
│   │   └── storage_client.py        # Supabase Storage client
│   └── utils/
│       ├── __init__.py
│       ├── auth.py                  # Ownership verification
│       └── database.py              # Supabase DB client

supabase/
├── migrations/
│   └── 20260115_add_jsonl_tracking.sql   # Database migration
└── storage_setup.sql                      # Storage bucket setup

Frontend changes:
├── src/pages/Documents.tsx          # Updated with JSONL UI
└── .env.fastapi.example             # Environment example
```

---

## UI Features Added

### In Documents Page

**For each file-based document:**

1. **Generate JSONL Button** (green database icon)
   - Only shows for documents with uploaded files
   - Disabled during generation
   - Locked once completed (no duplicate generation)

2. **Status Indicators**
   - `Generating...` - Blue spinner + text
   - `JSONL Ready` - Green checkmark
   - `Failed` - Red alert icon

3. **Download Button** (blue download icon)
   - Appears when generation completes
   - Opens signed URL (expires 1 hour)

4. **Retry Button** (orange database icon)
   - Appears if generation fails
   - Restarts the job

---

## How JSONL Generation Works

### Text Extraction
- Downloads file from Supabase Storage
- Extracts text based on file type:
  - **PDF**: PyPDF2 library
  - **DOCX**: python-docx library
  - **PPTX**: python-pptx library
  - **TXT/MD**: Direct read

### Chunking Strategy
- Split text on paragraph breaks (`\n\n`)
- Combine paragraphs until ~800 characters
- Preserves context boundaries

### LLM Prompt Strategy
Each chunk is sent to OpenRouter with this prompt:

```
You are a training data generator. Given the following text, 
create 4 diverse question-answer pairs in JSONL format.

RULES:
- Each line must be valid JSON with "messages" array
- Use roles: "system", "user", "assistant"
- Questions should test understanding, application, explanation
- Vary question types: factual, conceptual, how-to, why-based

[Text chunk here]

Generate exactly 4 JSONL lines:
```

### Output Format
Each line in the JSONL file:

```json
{"messages": [{"role": "system", "content": "You are an AI tutor."}, {"role": "user", "content": "What is X?"}, {"role": "assistant", "content": "X is..."}]}
```

This format is compatible with:
- OpenAI fine-tuning API
- Anthropic Claude fine-tuning
- Open-source fine-tuning tools (Axolotl, LLaMA Factory)

---

## API Endpoints

### Generate JSONL
```http
POST /api/jsonl/generate
Content-Type: application/json

{
  "document_id": "uuid",
  "user_id": "uuid"
}
```

### Check Status
```http
GET /api/jsonl/status/{job_id}
```

### Download JSONL
```http
GET /api/jsonl/download/{document_id}?user_id={user_id}
```

### Retry Failed Job
```http
POST /api/jsonl/retry/{document_id}?user_id={user_id}
```

---

## Production Deployment

### Recommended: Railway

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select your repo
4. Set root directory: `fastapi-backend`
5. Add environment variables
6. Deploy (auto-detects FastAPI)
7. Update frontend `.env` with Railway URL

### Alternative: Render, Heroku, VPS

See `fastapi-backend/README.md` for detailed deployment guides.

---

## Troubleshooting

### "Document has no file uploaded"
- Only file-based documents (not links) can generate JSONL
- Make sure document was uploaded through the UI

### Generation takes too long
- Large documents generate more chunks
- Each chunk takes ~5-10 seconds (LLM call)
- 100-page PDF might take 10-15 minutes
- Job continues even if user closes browser

### Generation failed
- Check OpenRouter API key is valid
- Check API rate limits
- Click retry button to restart
- Check backend logs for detailed error

### Download button doesn't appear
- Refresh the page
- Check job status via API
- Verify storage bucket permissions

---

## What Was NOT Changed

✅ **Existing document upload flow** - Still works exactly the same  
✅ **Embedding generation** - No changes to vectorSearchService  
✅ **Chat functionality** - No changes to LLM chat  
✅ **UI design** - Only added one button per document  
✅ **Link documents** - Still work, just no JSONL generation  

---

## Next Steps

1. **Test locally** - Upload a small document, generate JSONL
2. **Deploy backend** - Use Railway for easiest deployment
3. **Update frontend env** - Point to production backend URL
4. **Monitor** - Check Supabase logs for job status
5. **Fine-tune LLM** - Use generated JSONL with OpenAI/Anthropic

---

## Support

For issues:
1. Check `fastapi-backend/README.md` for detailed troubleshooting
2. Check backend logs: `python main.py` output
3. Check job status in Supabase:
   ```sql
   SELECT * FROM documents WHERE jsonl_status != 'idle';
   ```

---

## Example JSONL Output

```jsonl
{"messages": [{"role": "system", "content": "You are an AI tutor specializing in computer science."}, {"role": "user", "content": "What is the difference between a class and an object?"}, {"role": "assistant", "content": "A class is a blueprint that defines structure and behavior. An object is a concrete instance created from a class."}]}
{"messages": [{"role": "system", "content": "You are an AI tutor."}, {"role": "user", "content": "How do you define a class in Python?"}, {"role": "assistant", "content": "Use the 'class' keyword followed by the class name and a colon. Define methods inside using 'def'."}]}
{"messages": [{"role": "system", "content": "You are an AI tutor."}, {"role": "user", "content": "Why use object-oriented programming?"}, {"role": "assistant", "content": "OOP provides encapsulation, inheritance, and polymorphism, making code more modular, reusable, and maintainable."}]}
```

Ready for fine-tuning with OpenAI, Anthropic, or any LLM platform that accepts JSONL format.
