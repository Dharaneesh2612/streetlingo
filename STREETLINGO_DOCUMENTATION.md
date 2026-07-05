# StreetLingo - Complete Project Documentation

**Version:** 1.0  
**Date:** May 2026  
**Project:** AI-Powered Translation, Transliteration & Sign Scanning Application

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema](#4-database-schema)
5. [API Endpoints](#5-api-endpoints)
6. [AI Model & Prompting](#6-ai-model--prompting-strategy)
7. [Pages & User Flows](#7-pages--user-flows)
8. [Authentication](#8-authentication-flow)
9. [UI/UX Design](#9-uiux-design-system)
10. [Key Features](#10-key-features-breakdown)
11. [Data Flow Examples](#11-data-flow-examples)
12. [Error Handling](#12-error-handling)
13. [Performance](#13-performance--optimization)
14. [Environment Variables](#14-environment-variables)
15. [Deployment](#15-deployment-checklist)
16. [Future Enhancements](#16-future-enhancement-ideas)
17. [Limitations](#17-known-limitations)

---

## 1. Project Overview

**StreetLingo** is a modern web application designed to help travelers, students, and language learners translate, transliterate, and understand text from any language into 18+ supported languages. It combines AI-powered translation with a premium, calm UI experience.

### Live Features
- Real-time text translation
- Phonetic transliteration with native script + Roman pronunciation
- Sign/menu scanning and extraction via camera
- Cloud-based history and favorites
- Multi-language support (18+ languages)
- Voice synthesis for pronunciation
- Guest mode (localStorage) + authenticated mode (MongoDB)

### Target Users
- International travelers needing instant translation
- Language learners wanting pronunciation guidance
- Business professionals working with multilingual documents
- Students studying different language scripts

---

## 2. Tech Stack

### Frontend Technologies
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.2.2 | Full-stack React framework with App Router |
| React | 18.3.1 | UI library with hooks-based components |
| TypeScript | 5 | Type-safe JavaScript |
| Tailwind CSS | 3.4.4 | Utility-first CSS framework |
| Framer Motion | 12.38.0 | Smooth animations and transitions |
| Lucide React | 1.14.0 | 70+ icon library |
| pdfjs-dist | 5.6.205 | PDF rendering capability |

### Backend Technologies
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js API Routes | 16.2.2 | Server-side request handlers |
| next-auth | 5.0.0-beta.30 | OAuth authentication system |
| Mongoose | 9.4.1 | MongoDB schema and ORM |
| MongoDB | 7.1 | NoSQL database |

### External Services
| Service | Purpose |
|---------|---------|
| OpenRouter API | AI gateway for Gemini access |
| Google Gemini 2.0 Flash Lite | AI model for translation/OCR |
| Google OAuth 2.0 | User authentication |
| Web Speech API | Browser-native text-to-speech |

---

## 3. Project Structure

```
Transliteration DT/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts       # OAuth configuration
│   │   ├── history/
│   │   │   ├── route.ts                      # GET history
│   │   │   ├── save/route.ts                 # POST save to DB
│   │   │   └── [id]/
│   │   │       ├── route.ts                  # DELETE item
│   │   │       └── favorite/route.ts         # PATCH favorite toggle
│   │   ├── translate/route.ts                # POST translation
│   │   ├── transliterate/route.ts            # POST transliteration
│   │   └── scan/route.ts                     # POST image OCR
│   │
│   ├── page.tsx                              # Home/Landing page
│   ├── layout.tsx                            # Root layout
│   ├── globals.css                           # Global styles
│   │
│   ├── translate/page.tsx                    # Translation page
│   ├── transliterate/page.tsx                # Transliteration page
│   ├── scan/
│   │   ├── page.tsx                          # Scanner page
│   │   └── result/page.tsx                   # Scan results
│   ├── history/page.tsx                      # History with search
│   ├── favorites/page.tsx                    # Starred items
│   └── login/page.tsx                        # Sign-in callback
│
├── lib/
│   ├── db/connect.ts                         # MongoDB connection
│   ├── models/
│   │   ├── User.ts                           # User schema
│   │   └── History.ts                        # History schema
│   ├── gemini.ts                             # AI prompts & parsing
│   └── auth.ts                               # NextAuth config
│
├── components/
│   └── AuthNav.tsx                           # User menu component
│
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── .env.local                                # Secrets
└── node_modules/
```

---

## 4. Database Schema

### User Model
```typescript
interface IUser {
  _id:        ObjectId      // MongoDB ID
  name:       string        // From Google
  email:      string        // From Google (unique)
  image?:     string        // Avatar URL
  createdAt:  Date          // Account creation
}
```

**Indexes:** Email (unique)

### History Model
```typescript
interface IHistory {
  _id:          ObjectId
  userId?:      ObjectId    // Ref to User (null for guests)
  type:         "translate" | "transliterate" | "scan"
  inputText:    string      // Max 5000 chars
  languages:    string[]    // Target languages
  detectedLang: string      // AI-detected source language
  results: {
    language:   string      // Target language
    script:     string      // Translation in native script
    roman:      string      // Romanized version
  }[]
  isFavorite:   boolean     // User starred this
  createdAt:    Date        // Timestamp
}
```

**Indexes:**
- `{ userId: 1, createdAt: -1 }` — Fast per-user history
- `{ userId: 1, isFavorite: 1 }` — Fast favorites filtering

---

## 5. API Endpoints

### Authentication Endpoints
```
POST /api/auth/signin              # Initiate Google sign-in
POST /api/auth/signout             # Sign out
GET  /api/auth/callback/google     # OAuth callback
```

### Translation & Transliteration
```
POST /api/translate
  Request:  { text: string, languages: string[] }
  Response: { ok: true, data: TranslateResult } | { ok: false, error: string }
  Max text: 5000 characters
  
POST /api/transliterate
  Request:  { text: string, languages: string[] }
  Response: { ok: true, data: TransliterateResult } | { ok: false, error: string }
  Max text: 500 characters
  
POST /api/scan
  Request:  { image: string }  // base64 encoded
  Response: { ok: true, data: OCRResult } | { ok: false, error: string }
  Max size: 10 MB
```

### History Management
```
GET /api/history
  Query: ?favorites=1 (optional)
  Auth: Required for personalized results
  Response: { ok: true, data: IHistory[] }

POST /api/history/save
  Request: { type, inputText, languages, detectedLang?, results, isFavorite? }
  Auth: Optional (guests return 200 OK but skip)
  Response: { ok: true, data: IHistory }

DELETE /api/history/[id]
  Auth: Required + ownership check
  Response: { ok: true }

PATCH /api/history/[id]/favorite
  Request: { isFavorite: boolean }
  Auth: Required + ownership check
  Response: { ok: true, isFavorite: boolean }
```

---

## 6. AI Model & Prompting Strategy

### Model Information
- **Provider:** OpenRouter.ai
- **Model:** `google/gemini-2.0-flash-lite-001`
- **API Endpoint:** `https://openrouter.ai/api/v1/chat/completions`
- **Temperature:** 0.2 (low randomness for consistency)
- **Max Tokens:** 4096 (translate), 512 (OCR)

### Use Case 1: Translation
**Goal:** Translate complete text while preserving structure

**Key Instructions:**
- Detect source language automatically
- Translate full text (not summary)
- Preserve prices (₹20, etc.), emojis, line breaks
- For menus: translate item names, keep prices unchanged
- Return valid JSON only (no markdown)

**Output Format:**
```json
{
  "original": "input text",
  "detectedLang": "English",
  "results": [
    {
      "language": "Tamil",
      "script": "translated text in native script",
      "roman": "Pronunciation in latin letters"
    }
  ]
}
```

### Use Case 2: Transliteration
**Goal:** Map sound to different script WITHOUT translating meaning

**Key Instructions:**
- "Hello" → ஹலோ (Tamil), हेलो (Hindi) — same sound, different script
- Auto-detect direction: Roman-to-script OR script-to-roman
- Provide native script + Roman pronunciation
- Include explanation of sound mapping

**Output Format:**
```json
{
  "original": "Hello",
  "detectedLang": "English",
  "direction": "to-script",
  "results": [
    {
      "language": "Tamil",
      "script": "ஹலோ",
      "roman": "Halô",
      "note": "Sound-mapped via approximation"
    }
  ]
}
```

### Use Case 3: OCR + Sign Analysis
**Goal:** Extract sign text, classify, provide context & translations

**Tasks:**
1. Extract all visible text exactly as written
2. Detect language and sign type (8 categories)
3. Provide traveler-friendly context hint
4. Rate confidence (High/Medium/Low)
5. Suggest correction if OCR uncertain
6. List uncertain words
7. Translate into 13 languages

**Output Format:**
```json
{
  "originalText": "text from image",
  "language": "Tamil",
  "signType": "shop",
  "contextHint": "This shop sells books (100m ahead)",
  "transliteration": "Katai",
  "translation": "Shop",
  "confidence": "High",
  "didYouMean": "",
  "uncertainWords": [],
  "multiLang": [
    { "language": "Tamil", "script": "கடை", "roman": "Katai" },
    // ... 12 more languages
  ]
}
```

### JSON Repair Logic
- Extract outermost `{ ... }`
- Parse and return if valid
- If parse fails: auto-close open brackets/braces
- Fallback to empty results on final failure

---

## 7. Pages & User Flows

### Home Page (`/`)
- Hero section with animated icons
- Testimonials carousel
- Feature showcase (4 main features)
- Language preview (8 languages)
- How it works (3-step process)
- CTAs leading to `/translate`
- No authentication required

### Translate Page (`/translate`)
**Tabs:** Translate | History | Phrasebook

**Translate Tab:**
- Textarea for input (max 5000 chars, real-time counter)
- Multi-select for 18 languages
- Result cards with: Copy, Listen (TTS), Share, Star
- Font size toggle (A / A / A)

**History Tab:**
- Recent 20 translations from localStorage + MongoDB
- Each item clickable to reload
- Delete button (×) per item
- Time display ("2h ago")

**Phrasebook Tab:**
- Starred translations (localStorage + cloud)
- 50-item limit
- Same actions as history

### Transliterate Page (`/transliterate`)
- Text input with language selector
- Phonetic breakdown with script + Roman
- Examples provided (Hello, தமிழ், नमस्ते, etc.)
- Use case: Learn pronunciation

### Scan Page (`/scan`)
**Input Modes:** Upload or Camera

- **Upload:** Drag-and-drop or file picker
- **Camera:** Real-time preview with capture button
- **Result:** Extracted text, sign type, confidence, context hint

### Scan Result Page (`/scan/result`)
- Full sign analysis with 13 languages
- Collapsible cards per language
- Share button
- Copy buttons for script + Roman

### History Page (`/history`)
- Search bar (filters text, language, detected language)
- Type filter tabs (All, Translate, Transliterate, Scan)
- Expandable cards showing all results
- Delete per item
- Favorite toggle (star icon)
- Item count display

### Favorites Page (`/favorites`)
- Same UI as History
- Filtered to `isFavorite: true` only
- Auth required

### Login Page (`/login`)
- NextAuth callback destination
- Shows user profile after sign-in
- Redirects to `/` on success

---

## 8. Authentication Flow

### OAuth Flow
```
User clicks "Sign in"
  ↓
signIn("google", { callbackUrl: "/" })
  ↓
Google OAuth consent screen
  ↓
GET /api/auth/callback/google?code=...
  ↓
NextAuth exchanges code for tokens
  ↓
JWT Callback (lib/auth.ts):
  - Upsert user into MongoDB
  - Store userId in JWT token
  ↓
Session Callback:
  - Expose userId to client session
  ↓
Redirect to "/" with httpOnly auth cookie
```

### Session Management
- **Client-side:** `const { data: session } = useSession()`
- **Server-side:** `const session = await auth()`
- **Cookies:** httpOnly, secure, same-site
- **Expiry:** Configurable in NextAuth settings

### Guest vs. Authenticated
| Feature | Guest | Authenticated |
|---------|-------|---------------|
| Translate | ✅ localStorage | ✅ localStorage + cloud |
| Transliterate | ✅ localStorage | ✅ localStorage + cloud |
| Scan | ✅ localStorage | ✅ localStorage + cloud |
| History API | Returns `[]` | Returns user's records |
| Favorites | localStorage only | Cloud storage |
| Delete | localStorage only | Cloud storage |

---

## 9. UI/UX Design System

### Color Palette
```css
--bg: #f8fafc              /* Main background */
--bg-soft: #f3f4f6         /* Soft gray for hovers */
--bg-card: #ffffff         /* Card backgrounds */
--bg-glass: rgba(..., 0.72) /* Glassmorphism */
--text-1: #0f172a          /* Primary text (dark) */
--text-2: #475569          /* Secondary text (gray) */
--text-3: #64748b          /* Tertiary text (lighter) */
--accent: #7dd3fc          /* Primary CTA (sky blue) */
--accent-2: #c4b5fd        /* Secondary accent (lavender) */
--border: #e2e8f0          /* Light borders */
--radius: 24px             /* Card border radius */
--radius-sm: 16px          /* Button border radius */
--nav-h: 72px              /* Navbar height */
```

### Component Classes
- `.btn` — Base button
- `.btn--primary` — CTA button (sky blue)
- `.btn--ghost` — Secondary action
- `.btn--outline` — Border button
- `.navbar` — Fixed top nav with glassmorphism
- `.history-item` — History/favorites card
- `.tr-card` — Translation result card
- `.page-header` — Page title section
- `.inner-page` — Content wrapper
- `.toast` — Notification

### Typography
- **Font:** Inter, system-ui, sans-serif
- **Line Height:** 1.6–1.7
- **Responsive:** Tailwind breakpoints (sm, md, lg, xl)

### Animations
- **Framer Motion:** Hero, testimonials, floating elements
- **CSS Transitions:** Button hovers, sidebar toggles
- **Fade-in-up:** Scroll-triggered on feature cards

---

## 10. Key Features Breakdown

### Feature 1: Multi-Language Translation
- **Supported:** 18 languages (Tamil, Hindi, Telugu, Malayalam, Kannada, Bengali, Marathi, Gujarati, Punjabi, Urdu, English, French, German, Spanish, Chinese, Japanese, Russian, Arabic)
- **Max Input:** 5000 characters
- **Output:** Native script + Roman pronunciation
- **Preserves:** Prices (₹), emojis, formatting, menu structure

### Feature 2: Transliteration
- **Max Input:** 500 characters
- **Auto-Detection:** Roman-to-script or script-to-Roman
- **Output:** Sound-mapped script + pronunciation guide
- **Use Case:** Learning pronunciation, reading menus phonetically

### Feature 3: Sign Scanning
- **Input:** JPEG/PNG/WebP (up to 10 MB)
- **OCR:** Extracts all visible text
- **Sign Types:** 8 categories (direction, warning, shop, place, informational, religious, transport, unknown)
- **Confidence:** High/Medium/Low ratings
- **Context:** Traveler-friendly real-world hints
- **Output:** 13 languages auto-translated

### Feature 4: History & Favorites
- **Local Storage:** 20 translations, 50 phrasebook items
- **Cloud Storage:** 50 per user (indexed by createdAt)
- **Search:** Full-text on inputText, languages, detectedLang
- **Filtering:** By type (all, translate, transliterate, scan)
- **No TTL:** Manual delete or favorites only

### Feature 5: Voice Synthesis
- **API:** Web Speech API (browser native)
- **Language Support:** Per-language voice selection (BCP-47)
- **Speed:** 0.75x, 1x, 1.25x
- **Used In:** Results, scan output, history items

### Feature 6: Authentication
- **Provider:** Google OAuth only
- **Storage:** MongoDB user profile + JWT
- **History Sync:** Cloud + localStorage fallback
- **Favorites:** Cloud storage with sync

---

## 11. Data Flow Examples

### Example 1: User Translates "Hello"
```
1. User types "Hello" in textarea
2. Selects Tamil, Hindi
3. Clicks "Translate"
4. POST /api/translate { text: "Hello", languages: ["Tamil", "Hindi"] }
5. Backend calls Gemini with TRANSLATE_PROMPT
6. Gemini returns:
   {
     "original": "Hello",
     "detectedLang": "English",
     "results": [
       { "language": "Tamil", "script": "ஹலோ", "roman": "Halô" },
       { "language": "Hindi", "script": "हेलो", "roman": "Helo" }
     ]
   }
7. Frontend displays cards with Copy, Listen, Star
8. User clicks Star → POST /api/history/save
9. Item saved to MongoDB with isFavorite: true
```

### Example 2: User Scans Sign
```
1. User selects camera on /scan
2. Captures image
3. Frontend converts to base64
4. POST /api/scan { image: "data:image/jpeg;base64,..." }
5. Backend calls Gemini with OCR_PROMPT + image
6. Gemini extracts text, classifies, provides 13 languages
7. Response includes originalText, signType, confidence, multiLang
8. User navigates to /scan/result
9. User can delete or save to favorites
```

### Example 3: User Searches History
```
1. User on /history page
2. Types "வணக்கம்" in search box
3. Frontend filters real-time:
   items.filter(i =>
     i.inputText.toLowerCase().includes("வணக்கம்") ||
     i.languages.some(l => l.includes("வணக்கம்"))
   )
4. Results displayed instantly
5. User also filters by type (all, translate, transliterate, scan)
```

---

## 12. Error Handling

### HTTP Status Codes
| Code | Meaning | Example |
|------|---------|---------|
| 400 | Bad Request | Empty text, invalid JSON |
| 401 | Unauthorized | Not authenticated (protected route) |
| 404 | Not Found | History item doesn't exist |
| 500 | Server Error | Database/AI service failure |
| 502 | Bad Gateway | Gemini API error |
| 503 | Unavailable | GEMINI_API_KEY not configured |

### Frontend Error UI
- **Toast Notifications:** Displayed for 2.2 seconds
- **Error Boxes:** Prominent sections with icon + message
- **Retry Buttons:** Allow retrying failed requests
- **Fallbacks:** Show "Unknown" for missing fields

### Validation
- **Text Length:** Max 5000 chars (translate), 500 (transliterate)
- **Image Size:** Max 10 MB
- **Languages:** Minimum 1 required
- **Authorization:** DELETE/PATCH check userId ownership

---

## 13. Performance & Optimization

### Frontend
- **Code Splitting:** Next.js auto per-page bundles
- **Image Optimization:** Sharp library for resizing
- **Lazy Loading:** Scroll-triggered animations
- **Caching:** Browser localStorage for history/phrasebook

### Backend
- **Database Indexes:** 2 composite indexes for fast queries
- **Connection Pooling:** Mongoose caches global connection
- **API Limits:** History limit 50 items per fetch
- **Fire-and-Forget:** History save is async (doesn't block)

### AI API
- **Temperature:** 0.2 (consistent outputs)
- **Max Tokens:** 4096 (translate), 512 (OCR)
- **Batch Processing:** Not yet implemented

---

## 14. Environment Variables

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/streetlingo

# NextAuth
NEXTAUTH_SECRET=your_random_secret_here
NEXTAUTH_URL=http://localhost:3000

# AI API
GEMINI_API_KEY=your_openrouter_api_key_here
```

---

## 15. Deployment Checklist

- [ ] Run `npm run build` (verify no errors)
- [ ] Set `.env.local` variables (production URLs)
- [ ] Deploy to Vercel / AWS Amplify / similar
- [ ] Configure MongoDB Atlas (IP whitelist, authentication)
- [ ] Register Google OAuth redirect URIs
- [ ] Test authentication flow end-to-end
- [ ] Monitor API rate limits (OpenRouter, MongoDB)
- [ ] Set up error logging (Sentry, DataDog)
- [ ] Enable SSL/HTTPS
- [ ] Configure CORS if needed
- [ ] Set up database backups
- [ ] Test on mobile devices

---

## 16. Future Enhancement Ideas

1. **Pagination:** Implement cursor-based pagination for 100+ items
2. **Offline Mode:** Service Workers for offline translation cache
3. **Advanced OCR:** Client-side Tesseract.js for backup
4. **User Settings:** Language defaults, TTS voice preference, theme
5. **Batch Translation:** Upload CSV/JSON for bulk processing
6. **Public API:** Expose endpoints with rate limiting
7. **Mobile App:** React Native wrapper or dedicated PWA
8. **Collaboration:** Share translation sessions
9. **Dictionary:** Build vocabulary lists from history
10. **Analytics:** Track popular translations & languages
11. **Machine Learning:** Personalized language suggestions
12. **Accessibility:** Screen reader support, keyboard navigation
13. **Dark Mode:** Theme toggle in settings
14. **Keyboard Shortcuts:** Cmd/Ctrl + Enter to submit
15. **Translation Memory:** Cache for repeated phrases

---

## 17. Known Limitations

1. **Guest History:** Limited to browser storage (cleared on cache/new device)
2. **AI Errors:** Gemini may misidentify scripts or make translation errors
3. **No Real-Time Sync:** Multiple devices don't auto-sync (manual refresh required)
4. **Image Limits:** Large images truncated by base64 encoding
5. **Language Support:** Fixed to 18 languages (extensible)
6. **No Monetization:** No payment model defined
7. **Rate Limiting:** No user-level rate limiting yet
8. **Offline:** No offline translation capability
9. **Context:** AI doesn't learn from previous translations
10. **Voice Availability:** Browser-dependent TTS voice quality

---

## 18. Support & Maintenance

### Common Issues
- **"GEMINI_API_KEY not configured"** → Add key to `.env.local`
- **"MONGODB_URI not configured"** → Check MongoDB connection string
- **White screen on /history** → Clear browser cache, refresh
- **History not syncing** → Sign out, sign back in to sync
- **Camera not working** → Check browser permissions, HTTPS required

### Getting Help
- Check browser console for errors
- Review network tab in DevTools
- Check server logs for API errors
- Verify environment variables are set

---

## 19. Project Statistics

- **Total Pages:** 8 (Home, Translate, Transliterate, Scan, Scan Result, History, Favorites, Login)
- **API Routes:** 10 endpoints
- **Database Collections:** 2 (Users, History)
- **Supported Languages:** 18
- **Total Dependencies:** 10 (production)
- **Dev Dependencies:** 5
- **Total Lines of Code:** ~2000+
- **TypeScript Coverage:** 100%

---

## 20. License & Credits

**Created by:** Tech Busters  
**Framework:** Next.js 16 with TypeScript  
**AI Model:** Google Gemini 2.0 Flash Lite via OpenRouter  
**Database:** MongoDB  
**Authentication:** NextAuth + Google OAuth  

---

**End of Documentation**

Generated: May 9, 2026  
For questions or updates, contact the development team.
