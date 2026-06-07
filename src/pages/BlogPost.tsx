import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Navbar1 } from '../components/ui/navbar-1';
import { Footer } from '../components/ui/footer';
import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowLeft, Share2, BookOpen, ArrowRight } from 'lucide-react';

const blogPosts: Record<string, {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  authorAvatar: string;
  date: string;
  readTime: string;
  image: string;
  tags: string[];
  featured: boolean;
}> = {
  "supercharging-study-sessions-thinking-ai": {
    title: "Supercharging Study Sessions with Advanced Thinking Models",
    excerpt: "Learn how Vector Mind utilizes advanced thinking models to render live, collapsible reasoning traces—giving you a premium learning experience.",
    content: `## The Dawn of Reasoning AI

Until recently, interacting with conversational AI models felt like looking at a black box. You submit a prompt, wait for a few seconds, and the final answer appears. You had no way of knowing *how* the AI reached its conclusion, what assumptions it made, or if it corrected its own logic mid-flight.

With the release of the latest family of reasoning models, **thinking paths** have become standard for premium AI platforms.

Today, Vector Mind is thrilled to announce the integration of a state-of-the-art free thinking model, paired with a gorgeous, real-time collapsible reasoning interface designed to supercharge your study sessions.

---

## What is a "Thinking" Model?

Traditional models try to predict the next word immediately, which often leads to errors on logical reasoning, math, and coding tasks.

Reasoning models utilize a technique called **Chain-of-Thought (CoT)**. Before outputting a single word of the final answer, the model generates an internal thoughts log (enclosed within \`<think>...\` tags). During this thinking phase, the model:
1. **Deconstructs the prompt**: Breaks down complex queries into steps.
2. **Double-checks facts**: Cross-references its knowledge base.
3. **Corrects mistakes**: Identifies logical flaws in its draft solutions and refines them.

By showing this thinking trace, you don't just get the answer—you get a masterclass in problem-solving.

---

## How Vector Mind Displays AI Thinking

We wanted to ensure that the internal reasoning path is easily readable without cluttering your chat stream. Drawing inspiration from premium interfaces (like ChatGPT and Claude), we built a dedicated, dynamic thinking block:

### 1. Collapsible Thinking Box
The thinking path is enclosed in a dedicated container with a subtle gray border, styled to match the dark/light mode setup. If you're focused only on the final output, you can collapse the thinking logs with a single click.

### 2. Live Stream Support
As the model is thinking, you'll see a live pulsing indicator ("Thinking..."). The internal thoughts stream word-by-word in real-time, letting you follow the AI's logic as it happens.

### 3. Automatic Tag Parsing
Vector Mind's frontend parser extracts the content between the \\\`<think>\\\` and \\\`</think>\\\` tags, rendering it inside the thinking block while cleanly formatting the actual response below.

---

## Why Thinking Models Are Game-Changers for Education

For students and researchers, the reasoning process is far more valuable than a simple answer key.

* **Math & Science**: Follow the exact formulas and derivations step-by-step.
* **Code Debugging**: See why the AI chose a specific algorithm or library.
* **Literature Analysis**: Understand how the AI parsed historical context before summarizing a theme.

By making the AI's cognitive process transparent, Vector Mind acts as a collaborative tutor rather than a passive text generator.

---

## Try It Today

To experience this yourself, open Vector Mind's chat interface, type a complex question (e.g., *"Explain why 0.999... is mathematically equal to 1, showing the proof"*), and watch the reasoning panel unfold.

*Supercharge your learning today with Vector Mind's free, client-side reasoning engine!*`,
    category: "AI Education",
    author: "Yugal Bansal",
    authorAvatar: "https://ktjpfkrmsjopiytvxkzm.supabase.co/storage/v1/object/sign/meetourteam/yugalprof.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84NzBiYjJkYy0zMThiLTQwMGQtYmNkMC0wNTZmNzc0OWU4NzIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWV0b3VydGVhbS95dWdhbHByb2YucG5nIiwiaWF0IjoxNzc4NjU3MjgzLCJleHAiOjMxNzEwNzEyMTI4M30.SphQ0pfJE8OWbD9cgDerBuSrGJ75hyVkdagVH4cF8jo",
    date: "2026-06-07",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&q=80",
    featured: true,
    tags: ["thinking model", "reasoning trace", "vector mind", "ai education"]
  },
  "vectormind-puter-js-zero-cost-edge-ai": {
    title: "How Vector Mind Integrates Puter.js for Zero-Cost, Edge-Side AI",
    excerpt: "Discover how Vector Mind utilizes Puter.js to deliver fast, secure, and completely free AI completions directly from the client side without API keys or token limits.",
    content: `## Introduction

For modern AI platforms, the cost of hosting large language models and proxying completions represents the single greatest barrier to providing unlimited, free-to-use access to users. Traditional architectures force developers to route completions through a centralized server with expensive, pay-as-you-go API keys (like OpenAI or Anthropic).

At Vector Mind, we took a radically different path: **we decentralized inference entirely.** 

By integrating **Puter.js**, a client-side cloud OS SDK, Vector Mind executes state-of-the-art AI model calls directly from your browser. There is no middleman, no proxy server, and zero cost. Here's a deep dive into how we built this and why this architecture is the future of web-based AI tools.

---

## What is Puter.js?

Puter.js is a client-side cloud service library built by Puter.com. It allows developers to access high-quality services—like key-value databases, file storage, hosting, and **unlimited AI completions**—directly from frontend JavaScript code. 

Puter.js leverages a temporary user session generated on the fly. When a user first opens Vector Mind, a clean consent gate requests permission to authorize Puter.js. This creates a secure, sandboxed session key stored directly in the browser's context.

---

## How Vector Mind Integrates Puter.js

In traditional AI apps, requests travel like this:
\`\`\`
[User Browser] -> [Vector Mind Backend (Clerk Auth)] -> [OpenAI/Anthropic API] -> [Response]
\`\`\`
Every token costs money, which is billed directly to the developer's server.

With our Puter.js architecture, the request flow is entirely localized:
1. **Consent & Verification**: Upon first visit, the user authorizes Puter.js via our custom \`PuterGate\` component.
2. **Key Storage**: The temporary token is stored securely in the browser.
3. **Direct Completion**: When you ask Vector Mind to summarize a document, convert a PDF to JSONL, or chat with a file, the browser directly imports \`puter.js\` and calls the endpoint:
   \`\`\`javascript
   // Running directly on the client browser!
   const response = await window.puter.ai.chat(messageHistory, {
       model: 'advanced-reasoning-model'
   });
   \`\`\`
4. **Zero-Latency Streaming**: The stream response returns directly to the user's browser, eliminating middleman servers and reducing network latency by half.

Here is the exact architectural sequence flow of how Vector Mind connects with Puter.js and saves user access tokens locally:

![Puter Integration Flowchart](/images/puter-auth-flow.svg)

---

## Why This Structure is Extremely Good

Decentralizing AI completes solves the biggest issues plaguing SaaS applications today:

### 1. Absolute Cost Efficiency (Zero-Cost for All)
Because the browser calls the free models via the user's local session, the server hosting costs for Vector Mind remain completely flat, regardless of whether we serve 10 or 10,000,000 active chat queries. This allows us to keep the platform **100% free** for students and researchers without requiring subscription upgrades.

### 2. Complete Privacy & Anonymity
Your documents, messages, and AI responses never touch Vector Mind's databases. The data is kept entirely between your browser and the Puter.js backend. For enterprise users and researchers working with sensitive data, this zero-trust layout provides unmatched compliance and privacy.

### 3. Infinite Scalability & Rate Limits
In centralized systems, if a single user abuses the API, the developer's entire API key gets rate-limited, breaking the site for everyone. With Puter.js, rate limits are enforced at the individual browser session level. If one user makes 500 requests a minute, only their session is throttled; everyone else continues to enjoy blazing-fast responses.

### 4. Seamless Dark & Light UI Consent
We designed a clean, non-obtrusive \`PuterGate\` popup using our custom \`LiquidGlassCard\`. It supports both light and dark themes beautifully, using neutral grayscale tones so it looks like a premium native system modal. It never blocks your view or ruins the website's clean frosted aesthetics.

---

## What Model Powers Vector Mind?

Vector Mind utilizes a state-of-the-art free reasoning model via Puter's registry. This model includes:
- **Thinking Tags**: Full reasoning traces similar to OpenAI's o1 and Claude 3.5, letting you see exactly how the AI thought about your query.
- **Large Context Window**: Ideal for parsing large study guides and books.
- **Multilingual Mastery**: Translates, summarizes, and answers in Hinglish, Spanish, French, and dozens of other languages natively.

## Conclusion

By using Puter.js, Vector Mind is redefining how students and researchers interact with AI study tools. Our architecture proves that AI platforms can be incredibly fast, privacy-focused, and completely free without compromise. 

*Try uploading a PDF today and see the future of client-side AI processing in action!*`,
    category: "Technical Guide",
    author: "Yugal Bansal",
    authorAvatar: "https://ktjpfkrmsjopiytvxkzm.supabase.co/storage/v1/object/sign/meetourteam/yugalprof.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84NzBiYjJkYy0zMThiLTQwMGQtYmNkMC0wNTZmNzc0OWU4NzIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWV0b3VydGVhbS95dWdhbHByb2YucG5nIiwiaWF0IjoxNzc4NjU3MjgzLCJleHAiOjMxNzEwNzEyMTI4M30.SphQ0pfJE8OWbD9cgDerBuSrGJ75hyVkdagVH4cF8jo",
    date: "2026-06-07",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&q=80",
    featured: true,
    tags: ["puter.js", "client-side ai", "zero cost completed", "edge ai completed", "vector mind"]
  },
  "complete-guide-pdf-to-jsonl-conversion": {
    title: "Complete Guide to PDF to JSONL Conversion for AI Training",
    excerpt: "Learn how to transform PDF documents into high-quality JSONL datasets for training large language models. Step-by-step tutorial with best practices.",
    content: `## Introduction

Converting PDF documents to JSONL format is one of the most important steps in preparing training data for large language models. Whether you're fine-tuning a model for specific tasks or building a custom AI assistant, understanding how to properly convert documents to JSONL will save you countless hours of work.

In this comprehensive guide, we'll walk you through everything you need to know about PDF to JSONL conversion, from understanding the basics to implementing advanced conversion techniques.

## Why PDF to JSONL Conversion Matters

JSONL (JSON Lines) has become the preferred format for AI training data because:

- **Efficiency**: Each line is a complete JSON object, making it perfect for streaming and batch processing
- **Flexibility**: Different lines can have different structures while still being valid JSONL
- **Compatibility**: Works seamlessly with all major ML frameworks and tools

## Methods for Converting PDFs to JSONL

### Method 1: Using Vector Mind AI (Recommended)

Vector Mind AI provides the easiest way to convert PDFs to JSONL:

1. Upload your PDF document to the platform
2. Select your desired output format (chat, instruction, or conversational)
3. Choose the number of training examples you want to generate
4. Download your JSONL file ready for training

### Method 2: Python Script Conversion

For more control, you can use Python with libraries like PyPDF2 and json:

\`\`\`python
import PyPDF2
import json

def pdf_to_jsonl(pdf_path, output_path):
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text()

    # Split text into chunks for training
    chunks = text.split('\\n\\n')

    with open(output_path, 'w') as f:
        for i, chunk in enumerate(chunks):
            if chunk.strip():
                data = {
                    "id": i,
                    "text": chunk.strip(),
                    "source": pdf_path
                }
                f.write(json.dumps(data) + '\\n')

pdf_to_jsonl("document.pdf", "output.jsonl")
\`\`\`

## Best Practices for Quality Output

### 1. Text Cleaning

Before conversion, clean your PDF text:

- Remove headers and footers
- Standardize formatting
- Handle special characters properly

### 2. Data Augmentation

Enhance your dataset by:

- Creating variations of each example
- Adding context to questions and answers
- Including multiple question formats

### 3. Quality Control

Always validate your JSONL:

- Check for empty lines
- Verify JSON syntax
- Ensure consistent formatting

## Common Challenges and Solutions

### Challenge 1: Scanned PDFs

Solution: Use OCR (Optical Character Recognition) tools like Tesseract before conversion.

### Challenge 2: Complex Layouts

Solution: Use AI-powered extraction tools that understand document structure.

### Challenge 3: Large Documents

Solution: Split into smaller sections and process in batches.

## Conclusion

PDF to JSONL conversion is a critical skill for anyone working with AI training data. Whether you use automated tools like Vector Mind AI or build custom solutions, the key is to produce high-quality, well-formatted training data that will help your models perform at their best.`,
    category: "Technical Guide",
    author: "Yugal Bansal",
    authorAvatar: "https://ktjpfkrmsjopiytvxkzm.supabase.co/storage/v1/object/sign/meetourteam/yugalprof.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84NzBiYjJkYy0zMThiLTQwMGQtYmNkMC0wNTZmNzc0OWU4NzIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWV0b3VydGVhbS95dWdhbHByb2YucG5nIiwiaWF0IjoxNzc4NjU3MjgzLCJleHAiOjMxNzEwNzEyMTI4M30.SphQ0pfJE8OWbD9cgDerBuSrGJ75hyVkdagVH4cF8jo",
    date: "2026-05-13",
    readTime: "15 min read",
    image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=1200&q=80",
    featured: true,
    tags: ["pdf to jsonl", "jsonl converter", "ai training data", "dataset creation", "llm fine-tuning", "machine learning"]
  },
  "jsonl-format-complete-tutorial-2026": {
    title: "JSONL Format: Complete Tutorial for AI Model Training in 2026",
    excerpt: "Master JSONL format for AI training. Learn about different schemas, best practices, and how to create high-quality training datasets.",
    content: `## What is JSONL?

JSONL (JSON Lines) is a text-based format where each line is a valid JSON object. This simple but powerful format has become the gold standard for AI training data, especially for large language models.

## Why JSONL is Perfect for AI Training

### Streaming Support

JSONL supports streaming processing, which is crucial for handling large datasets:

- Process millions of examples without loading everything into memory
- Train on datasets larger than available RAM
- Implement real-time data augmentation

### Easy to Debug

Each line being a complete JSON object means:

- Easy to inspect individual examples
- Simple to find and fix errors
- No parsing complex nested structures

## JSONL Formats for AI Training

### 1. Chat Format

\`\`\`json
{"messages": [{"role": "system", "content": "You are a helpful assistant."}, {"role": "user", "content": "What is machine learning?"}, {"role": "assistant", "content": "Machine learning is..."}]}
\`\`\`

### 2. Instruction Format

\`\`\`json
{"instruction": "Explain the concept of neural networks", "output": "Neural networks are computing systems inspired by biological neural networks..."}
\`\`\`

### 3. Question-Answer Format

\`\`\`json
{"question": "What is Python?", "answer": "Python is a high-level programming language known for its simplicity and readability."}
\`\`\`

## Creating High-Quality JSONL Data

### Quality Checklist

- [ ] Consistent JSON structure
- [ ] No missing fields
- [ ] Proper encoding (UTF-8)
- [ ] No trailing commas
- [ ] Balanced quotes and brackets

### Best Practices

1. **Use descriptive field names**: Make your data self-documenting
2. **Include metadata**: Add source, date, and context information
3. **Validate regularly**: Check for errors during creation
4. **Version your data**: Keep track of dataset changes

## Tools for Working with JSONL

### Validation Tools

- jsonlint.com - Online JSON validator
- jq - Command-line JSON processor
- python -m json.tool - Python built-in validator

### Processing Tools

- Python's jsonlines library
- Node.js's jsonlines package
- Apache Spark for large-scale processing

## Conclusion

JSONL is the backbone of modern AI training data. By understanding its structure and best practices, you can create high-quality datasets that will help your AI models achieve better performance.`,
    category: "Tutorial",
    author: "Yugal Bansal",
    authorAvatar: "https://ktjpfkrmsjopiytvxkzm.supabase.co/storage/v1/object/sign/meetourteam/yugalprof.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84NzBiYjJkYy0zMThiLTQwMGQtYmNkMC0wNTZmNzc0OWU4NzIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWV0b3VydGVhbS95dWdhbHByb2YucG5nIiwiaWF0IjoxNzc4NjU3MjgzLCJleHAiOjMxNzEwNzEyMTI4M30.SphQ0pfJE8OWbD9cgDerBuSrGJ75hyVkdagVH4cF8jo",
    date: "2026-05-12",
    readTime: "12 min read",
    image: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=1200&q=80",
    featured: true,
    tags: ["jsonl format", "json lines", "ai training", "llm", "data format", "machine learning"]
  },
  "ai-study-tools-ace-exams": {
    title: "How to Use AI Study Tools to Ace Your Exams in 2026",
    excerpt: "Discover the best AI-powered study tools and techniques to improve your exam preparation. From document analysis to practice tests.",
    content: `## The AI Revolution in Education

Artificial intelligence has transformed how students prepare for exams. In 2026, AI study tools are no longer a luxury—they're a necessity for academic success.

## Top AI Study Tools

### 1. Document Analysis AI

Upload your lecture notes, textbooks, or slide decks and get:

- Instant summaries of key concepts
- Important points highlighted
- Related concepts connected

### 2. AI-Powered Practice Tests

Generate unlimited practice questions:

- Multiple choice questions
- Short answer questions
- Full-length mock exams

### 3. Smart Flashcard Generators

Create flashcards instantly:

- Key terms and definitions
- Concept relationships
- Visual diagrams

## How to Use AI Effectively

### Step 1: Gather Your Materials

Collect all your course materials:

- Textbooks
- Lecture notes
- Previous exams
- Study guides

### Step 2: Upload and Analyze

Use Vector Mind AI to:

- Parse all documents
- Identify key concepts
- Generate study materials

### Step 3: Active Recall Practice

Use AI-generated materials for:

- Spaced repetition
- Self-testing
- Active recall sessions

## Study Schedule Template

Here's an effective 4-week exam prep plan using AI:

**Week 1**: Upload materials, generate summaries
**Week 2**: Create and review flashcards
**Week 3**: Practice tests and identify weak areas
**Week 4**: Focus on weak areas, final review

## Tips for Maximum Efficiency

1. **Start early**: AI tools work best with more time
2. **Be specific**: Ask targeted questions
3. **Review regularly**: Don't just generate—use the materials
4. **Track progress**: Monitor your improvement

## Conclusion

AI study tools are powerful allies in exam preparation. By leveraging these tools effectively, you can study smarter, not harder, and achieve better results in your exams.`,
    category: "Study Tips",
    author: "Yugal Bansal",
    authorAvatar: "https://ktjpfkrmsjopiytvxkzm.supabase.co/storage/v1/object/sign/meetourteam/yugalprof.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84NzBiYjJkYy0zMThiLTQwMGQtYmNkMC0wNTZmNzc0OWU4NzIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWV0b3VydGVhbS95dWdhbHByb2YucG5nIiwiaWF0IjoxNzc4NjU3MjgzLCJleHAiOjMxNzEwNzEyMTI4M30.SphQ0pfJE8OWbD9cgDerBuSrGJ75hyVkdagVH4cF8jo",
    date: "2026-05-11",
    readTime: "8 min read",
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&q=80",
    featured: true,
    tags: ["ai study tools", "exam preparation", "study tips", "ai tutoring", "exam success"]
  },
  "free-jsonl-generator-online": {
    title: "Best Free JSONL Generator Online in 2026 - Complete Comparison",
    excerpt: "Compare the top free JSONL generators available online. Find the best tool for converting documents to AI training data without spending a dime.",
    content: `## Why Free JSONL Generators Matter

For students, researchers, and small teams, free JSONL generators provide an accessible way to create AI training data without significant investment.

## Top Free JSONL Generators

### 1. Vector Mind AI (Best Overall)

**Pros:**
- Completely free tier
- Multiple output formats
- Supports various document types
- No registration required for basic use

**Cons:**
- Advanced features require account

### 2. Online JSONL Converters

**Pros:**
- Quick conversion
- No installation needed
- Basic formats supported

**Cons:**
- Limited customization
- Privacy concerns with sensitive data

### 3. Python Scripts (DIY)

**Pros:**
- Full control
- Customizable
- Free forever

**Cons:**
- Requires programming knowledge
- Time-intensive

## Feature Comparison

| Feature | Vector Mind AI | Online Tools | Python |
|---------|---------------|--------------|--------|
| Free Tier | ✓ | ✓ | ✓ |
| PDF Support | ✓ | Limited | ✓ |
| Custom Formats | ✓ | ✗ | ✓ |
| Batch Processing | ✓ | ✗ | ✓ |
| No Coding | ✓ | ✓ | ✗ |

## How to Choose the Right Tool

### Consider Your Needs

1. **Volume**: How much data do you need?
2. **Format**: What output format do you require?
3. **Privacy**: How sensitive is your data?
4. **Technical Skills**: Are you comfortable with code?

## Recommendation

For most users, Vector Mind AI provides the best balance of features, ease of use, and cost-effectiveness. The free tier is genuinely free with no hidden limitations.`,
    category: "Tools Review",
    author: "Yugal Bansal",
    authorAvatar: "https://ktjpfkrmsjopiytvxkzm.supabase.co/storage/v1/object/sign/meetourteam/yugalprof.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84NzBiYjJkYy0zMThiLTQwMGQtYmNkMC0wNTZmNzc0OWU4NzIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWV0b3VydGVhbS95dWdhbHByb2YucG5nIiwiaWF0IjoxNzc4NjU3MjgzLCJleHAiOjMxNzEwNzEyMTI4M30.SphQ0pfJE8OWbD9cgDerBuSrGJ75hyVkdagVH4cF8jo",
    date: "2026-05-10",
    readTime: "10 min read",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
    featured: false,
    tags: ["free jsonl generator", "jsonl converter free", "ai dataset generator", "free tools"]
  },
  "document-chat-ai-explained": {
    title: "Document Chat with AI Explained: The Future of Reading",
    excerpt: "Learn how AI-powered document chat works and how it revolutionizes how we read, analyze, and extract information from documents.",
    content: `## What is Document Chat AI?

Document chat AI allows you to have conversational interactions with your documents. Instead of manually searching through pages, you can simply ask questions and get instant answers.

## How It Works

### 1. Document Processing

The AI first processes your document:

- Extracts text from various formats (PDF, DOCX, etc.)
- Identifies structure (headings, paragraphs, tables)
- Creates semantic representations

### 2. Question Understanding

When you ask a question:

- AI interprets your intent
- Identifies relevant sections
- Formulates a comprehensive answer

### 3. Answer Generation

The AI then:

- Synthesizes information from multiple sources
- Provides clear, contextually relevant answers
- Includes citations when possible

## Use Cases

### Academic Research

- Quickly understand papers
- Compare multiple documents
- Extract specific data points

### Business Analysis

- Review contracts efficiently
- Analyze reports
- Extract key insights

### Legal Work

- Review case documents
- Find relevant precedents
- Summarize lengthy filings

## Benefits

1. **Time Savings**: Find information in seconds instead of hours
2. **Better Understanding**: Get clear explanations of complex concepts
3. **Improved Recall**: Never lose track of where information is located

## The Future

Document chat AI is just the beginning. Future developments will include:

- Multi-document reasoning
- Automatic citation generation
- Cross-language support
- Real-time collaboration`,
    category: "AI Education",
    author: "Yugal Bansal",
    authorAvatar: "https://ktjpfkrmsjopiytvxkzm.supabase.co/storage/v1/object/sign/meetourteam/yugalprof.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84NzBiYjJkYy0zMThiLTQwMGQtYmNkMC0wNTZmNzc0OWU4NzIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWV0b3VydGVhbS95dWdhbHByb2YucG5nIiwiaWF0IjoxNzc4NjU3MjgzLCJleHAiOjMxNzEwNzEyMTI4M30.SphQ0pfJE8OWbD9cgDerBuSrGJ75hyVkdagVH4cF8jo",
    date: "2026-05-09",
    readTime: "9 min read",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad9ed?w=1200&q=80",
    featured: false,
    tags: ["document chat", "ai chat", "pdf chat", "document analysis", "ai reading"]
  },
  "llm-fine-tuning-beginners-guide": {
    title: "LLM Fine-Tuning for Beginners: Complete Start Guide 2026",
    excerpt: "Everything you need to know about fine-tuning large language models. From preparing data to training your first model.",
    content: `## What is LLM Fine-Tuning?

Fine-tuning is the process of taking a pre-trained language model and adapting it for a specific task or domain. Instead of training from scratch, you start with a model that already understands language and teach it your specific requirements.

## Why Fine-Tune?

### Benefits

- **Less Data Required**: Fine-tuning needs far less data than training from scratch
- **Better Performance**: Models achieve higher accuracy on specific tasks
- **Faster Training**: Fine-tuning takes hours instead of weeks

## The Fine-Tuning Process

### Step 1: Prepare Your Data

Your training data should be:

- High-quality and accurate
- Representative of your target use case
- Properly formatted in JSONL

### Step 2: Choose a Base Model

Popular options include:

- LLaMA 2
- Mistral
- Falcon
- Open-source models from Hugging Face

### Step 3: Configure Training

Key parameters to consider:

- Learning rate
- Batch size
- Number of epochs
- Training split ratio

### Step 4: Train and Evaluate

- Monitor training loss
- Validate on test set
- Iterate and improve

## Common Mistakes to Avoid

1. **Using poor quality data**: Garbage in, garbage out
2. **Overfitting**: Too few training examples for complex tasks
3. **Wrong hyperparameters**: Start with recommended defaults

## Tools for Fine-Tuning

- **Transformers library**: Most popular option
- **Unsloth**: Faster fine-tuning with less memory
- **LoRA adapters**: Memory-efficient fine-tuning

## Conclusion

LLM fine-tuning is accessible to beginners with the right guidance. Start small, learn from mistakes, and progressively tackle more complex projects.`,
    category: "Machine Learning",
    author: "Yugal Bansal",
    authorAvatar: "https://ktjpfkrmsjopiytvxkzm.supabase.co/storage/v1/object/sign/meetourteam/yugalprof.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84NzBiYjJkYy0zMThiLTQwMGQtYmNkMC0wNTZmNzc0OWU4NzIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWV0b3VydGVhbS95dWdhbHByb2YucG5nIiwiaWF0IjoxNzc4NjU3MjgzLCJleHAiOjMxNzEwNzEyMTI4M30.SphQ0pfJE8OWbD9cgDerBuSrGJ75hyVkdagVH4cF8jo",
    date: "2026-05-08",
    readTime: "14 min read",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad9ed?w=1200&q=80",
    featured: false,
    tags: ["llm fine-tuning", "fine-tuning guide", "language model", "ai training", "beginners"]
  },
  "ai-education-future-2026": {
    title: "The Future of AI in Education: Trends and Predictions for 2026",
    excerpt: "Explore the latest trends in AI-powered education. From personalized learning to AI tutors, discover what's shaping the future of education.",
    content: `## AI Education in 2026

The education landscape has dramatically transformed with AI integration. Let's explore the key trends shaping learning in 2026.

## Key Trends

### 1. Personalized Learning Paths

AI analyzes individual student patterns to:

- Recommend specific content
- Adjust difficulty levels
- Identify knowledge gaps
- Optimize study schedules

### 2. AI Tutors Available 24/7

Personal AI tutors provide:

- Instant feedback on questions
- Patient, unlimited practice opportunities
- Explanations in multiple styles
- Round-the-clock availability

### 3. Automated Assessment

AI transforms how we evaluate learning:

- Instant grading of assignments
- Detailed performance analytics
- Personalized feedback generation
- Reduced teacher workload

### 4. Virtual Reality Integration

Immersive learning experiences combine VR with AI:

- Virtual science labs
- Historical recreations
- Language immersion environments

## Impact on Different Sectors

### K-12 Education

- Personalized homework assignments
- Early intervention for struggling students
- Enhanced parental involvement tools

### Higher Education

- Research assistance
- Automated grading
- Adaptive course materials

### Corporate Training

- On-demand skill development
- Custom learning paths
- Performance tracking

## Challenges and Considerations

### Privacy Concerns

- Data security must be prioritized
- Parental consent requirements
- Transparent data usage policies

### Equity Issues

- Ensuring AI tools are accessible to all
- Addressing digital divide
- Preventing algorithmic bias

## Looking Ahead

The future of AI in education is bright but requires careful implementation. The key is balancing technological innovation with pedagogical expertise and ethical considerations.`,
    category: "AI Education",
    author: "Yugal Bansal",
    authorAvatar: "https://ktjpfkrmsjopiytvxkzm.supabase.co/storage/v1/object/sign/meetourteam/yugalprof.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84NzBiYjJkYy0zMThiLTQwMGQtYmNkMC0wNTZmNzc0OWU4NzIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWV0b3VydGVhbS95dWdhbHByb2YucG5nIiwiaWF0IjoxNzc4NjU3MjgzLCJleHAiOjMxNzEwNzEyMTI4M30.SphQ0pfJE8OWbD9cgDerBuSrGJ75hyVkdagVH4cF8jo",
    date: "2026-05-07",
    readTime: "11 min read",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80",
    featured: false,
    tags: ["ai education", "future of education", "ai trends", "personalized learning"]
  },
  "batch-jsonl-generation-guide": {
    title: "How to Generate JSONL Datasets in Batch: Scalable AI Training",
    excerpt: "Learn efficient methods for generating large-scale JSONL datasets. Save time and resources with batch processing techniques.",
    content: `## Why Batch Processing Matters

When working on AI projects requiring large datasets, processing documents one by one is inefficient. Batch processing allows you to convert hundreds or thousands of documents simultaneously.

## Batch Processing Strategies

### 1. Parallel Processing

Split your workload across multiple workers:

\`\`\`python
from concurrent.futures import ThreadPoolExecutor
import json

def process_document(file_path):
    # Process single document
    return convert_to_jsonl(file_path)

with ThreadPoolExecutor(max_workers=4) as executor:
    results = executor.map(process_document, file_list)
\`\`\`

### 2. Chunk-Based Processing

Process in manageable chunks:

- Divide documents into groups
- Process each group sequentially
- Combine results at the end

### 3. Cloud-Based Processing

Use cloud functions for unlimited scaling:

- AWS Lambda
- Google Cloud Functions
- Azure Functions

## Best Practices

### Optimize for Speed

1. **Use async processing**: Don't wait for each file
2. **Limit memory usage**: Stream data instead of loading all
3. **Cache results**: Don't reprocess unchanged files

### Quality Control

- Validate output after each batch
- Log errors for review
- Keep original files for reprocessing

## Handling Large Datasets

### For Datasets Over 10GB

- Use cloud storage (S3, GCS)
- Process in multiple stages
- Implement checkpointing

### Error Handling

- Skip and log failed files
- Retry with exponential backoff
- Generate error reports

## Conclusion

Batch processing is essential for scalable JSONL generation. Start with simple parallel processing and scale up as your needs grow.`,
    category: "Technical Guide",
    author: "Yugal Bansal",
    authorAvatar: "https://ktjpfkrmsjopiytvxkzm.supabase.co/storage/v1/object/sign/meetourteam/yugalprof.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84NzBiYjJkYy0zMThiLTQwMGQtYmNkMC0wNTZmNzc0OWU4NzIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWV0b3VydGVhbS95dWdhbHByb2YucG5nIiwiaWF0IjoxNzc4NjU3MjgzLCJleHAiOjMxNzEwNzEyMTI4M30.SphQ0pfJE8OWbD9cgDerBuSrGJ75hyVkdagVH4cF8jo",
    date: "2026-05-06",
    readTime: "13 min read",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
    featured: false,
    tags: ["batch jsonl", "dataset generation", "ai training data", "batch processing", "scalability"]
  }
};

function parseInlineMarkdown(text: string): string {
  let html = text;
  
  // Escape HTML tags to prevent XSS
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold (**text**)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-zinc-900 dark:text-white">$1</strong>');
  
  // Inline code (`code`)
  html = html.replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded font-mono text-xs text-zinc-800 dark:text-zinc-200">$1</code>');

  // Links ([text](url))
  html = html.replace(/\[(.*?)\]\(([^"]+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline font-medium">$1</a>');

  return html;
}

function parseMarkdown(text: string): React.ReactNode[] {
  // Protect code blocks
  const parts = text.split(/(```[\s\S]*?```)/g);
  const elements: React.ReactNode[] = [];
  let elKey = 0;

  parts.forEach((part) => {
    if (part.startsWith('```')) {
      const match = part.match(/```(\w*)\n([\s\S]*?)```/);
      const code = match ? match[2] : part.slice(3, -3);
      elements.push(
        <pre key={elKey++} className="bg-zinc-950 dark:bg-black text-zinc-100 p-4 rounded-xl font-mono text-xs md:text-sm overflow-x-auto my-6 border border-zinc-800 shadow-inner">
          <code>{code.trim()}</code>
        </pre>
      );
      return;
    }
    
    // Process normal text block by lines
    const lines = part.split('\n');
    let inList = false;
    let listItems: string[] = [];
    let isOrdered = false;

    const flushList = (key: string | number) => {
      if (listItems.length > 0) {
        if (isOrdered) {
          elements.push(
            <ol key={`list-${key}-${elKey++}`} className="list-decimal pl-6 my-4 space-y-2 text-zinc-750 dark:text-zinc-300">
              {listItems.map((item, idx) => (
                <li key={idx} dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(item) }} />
              ))}
            </ol>
          );
        } else {
          elements.push(
            <ul key={`list-${key}-${elKey++}`} className="list-disc pl-6 my-4 space-y-2 text-zinc-750 dark:text-zinc-300">
              {listItems.map((item, idx) => (
                <li key={idx} dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(item) }} />
              ))}
            </ul>
          );
        }
        listItems = [];
        inList = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed === '') {
        flushList(i);
        continue;
      }

      // Check headings
      if (trimmed.startsWith('## ')) {
        flushList(i);
        elements.push(
          <h2 key={elKey++} className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mt-10 mb-5 tracking-tight border-b border-zinc-150 dark:border-zinc-800/80 pb-2">
            {trimmed.replace('## ', '')}
          </h2>
        );
        continue;
      }

      if (trimmed.startsWith('### ')) {
        flushList(i);
        elements.push(
          <h3 key={elKey++} className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white mt-8 mb-4 tracking-tight">
            {trimmed.replace('### ', '')}
          </h3>
        );
        continue;
      }

      // Check horizontal rule
      if (trimmed === '---') {
        flushList(i);
        elements.push(<hr key={elKey++} className="my-8 border-t border-zinc-200 dark:border-zinc-800" />);
        continue;
      }

      // Check images
      const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imgMatch) {
        flushList(i);
        elements.push(
          <div key={elKey++} className="my-8 flex flex-col items-center gap-2">
            <img src={imgMatch[2]} alt={imgMatch[1]} className="rounded-2xl border border-zinc-250 dark:border-zinc-800 shadow-md max-w-full hover:scale-[1.01] transition-transform duration-300" />
            {imgMatch[1] && <span className="text-xs text-zinc-500 dark:text-zinc-400">{imgMatch[1]}</span>}
          </div>
        );
        continue;
      }

      // Check lists
      const isUnorderedItem = trimmed.startsWith('- ') || trimmed.startsWith('* ');
      const orderedMatch = trimmed.match(/^(\d+)\.\s(.*)/);

      if (isUnorderedItem) {
        if (!inList || isOrdered) {
          flushList(i);
          isOrdered = false;
          inList = true;
        }
        listItems.push(trimmed.slice(2));
      } else if (orderedMatch) {
        if (!inList || !isOrdered) {
          flushList(i);
          isOrdered = true;
          inList = true;
        }
        listItems.push(orderedMatch[2]);
      } else {
        flushList(i);
        elements.push(
          <p
            key={elKey++}
            className="text-zinc-700 dark:text-zinc-300 mb-5 leading-relaxed text-base md:text-lg font-normal"
            dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(trimmed) }}
          />
        );
      }
    }
    flushList(lines.length);
  });

  return elements;
}

export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const post = slug && blogPosts[slug];

  // Related posts (same category)
  const relatedPosts = post
    ? Object.values(blogPosts)
        .filter(p => p.category === post.category && p.slug !== slug)
        .slice(0, 3)
    : [];

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <Navbar1 />
        <div className="max-w-4xl mx-auto px-4 py-32 text-center">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Article Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">The article you're looking for doesn't exist or has been moved.</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/blog')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Blog
            </button>
            <Link
              to="/"
              className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Go Home
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const content = post?.content || '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Helmet>
        <title>{post?.title || 'Blog Post'} | Vector Mind AI Blog</title>
        <meta name="description" content={post?.excerpt || ''} />
        <meta name="keywords" content={post?.tags?.join(", ") || ''} />
        <meta property="og:title" content={post?.title || ''} />
        <meta property="og:description" content={post?.excerpt || ''} />
        <meta property="og:image" content={post?.image || ''} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={`https://vectormind.site/blog/${slug}`} />
      </Helmet>

      <Navbar1 />

      {/* Hero Image */}
      <div className="relative h-64 md:h-80 lg:h-96 overflow-hidden">
        <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => navigate('/blog')}
              className="text-white/80 hover:text-white flex items-center gap-2 mb-4 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Blog
            </button>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <article className="max-w-3xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Category & Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="inline-block px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-full">
              {post.category}
            </span>
            {post.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm rounded-full">
                #{tag}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            {post.title}
          </h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-8 mb-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <img src={post.authorAvatar} alt={post.author} className="w-12 h-12 rounded-full object-cover border-2 border-blue-500" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{post.author}</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" /> {post.date}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{post.readTime}</span>
              </div>
            </div>
          </div>

          {/* Social Share */}
          <div className="flex items-center gap-3 mb-10">
            <span className="text-gray-500 dark:text-gray-400 text-sm">Share:</span>
            <button className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-blue-100 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </button>
            <button className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-blue-100 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </button>
            <button className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-blue-100 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.46 6c-.85.38-1.78.64-2.75.76 1-.6 1.76-1.55 2.12-2.68-.93.55-1.96.95-3.06 1.17-.88-.94-2.13-1.53-3.51-1.53-2.66 0-4.81 2.16-4.81 4.81 0 .38.04.75.13 1.1-4-.2-7.58-2.11-9.96-5.02-.42.72-.66 1.56-.66 2.46 0 1.68.85 3.16 2.14 4.02-.79-.02-1.53-.24-2.18-.6v.06c0 2.35 1.67 4.31 3.88 4.76-.4.1-.83.16-1.27.16-.31 0-.62-.03-.92-.08.63 1.96 2.45 3.39 4.61 3.43-1.69 1.32-3.83 2.1-6.15 2.1-.4 0-.8-.02-1.19-.07 2.19 1.4 4.78 2.22 7.57 2.22 9.07 0 14.02-7.52 14.02-14.02 0-.21 0-.43-.01-.64.96-.69 1.79-1.56 2.45-2.55z"/></svg>
            </button>
          </div>

          {/* Main Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            {parseMarkdown(content)}
          </div>

          {/* All Tags */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 mb-3">Tags:</p>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag, i) => (
                <span key={i} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-16 bg-white dark:bg-gray-800">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Related Articles</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map((related, index) => {
                const relatedKey = Object.keys(blogPosts).find(key => blogPosts[key] === related);
                return (
                  <Link
                    key={index}
                    to={`/blog/${relatedKey}`}
                    className="group"
                  >
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                      <img src={related.image} alt={related.title} className="w-full h-40 object-cover" />
                      <div className="p-4">
                        <span className="text-xs text-blue-600 font-medium">{related.category}</span>
                        <h3 className="font-bold text-gray-900 dark:text-white mt-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                          {related.title}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">{related.readTime}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="max-w-2xl mx-auto text-center px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Start Creating JSONL Datasets</h2>
          <p className="text-blue-100 mb-6">Transform your documents into AI training data with Vector Mind AI</p>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors inline-flex items-center gap-2"
          >
            Get Started Free <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}