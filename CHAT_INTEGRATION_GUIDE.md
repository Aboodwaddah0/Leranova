# Chat + Chatbot Integration Documentation

**Date**: April 5, 2026  
**Component**: Learnova Chat System with Chatbot Integration  
**Status**: ✅ Implementation Complete - Ready for Testing

---

## 1. Integration Overview

This integration adds production-grade chatbot support to the Learnova chat system. When a user sends a message to a chat (group or private), the system:

1. Saves the user message
2. Triggers the chatbot with lesson-scoped RAG context
3. Saves the bot reply as a message in the same chat
4. Returns both messages in a clean response

**No schema changes** — uses existing `messages` table with a system bot user approach.

---

## 2. Architecture

### 2.1 System Components

```
User sends message
      ↓
[chatController.sendMessage]
      ↓
[chatService.sendMessageWithBotReply]
  ├─ Verify user is chat participant
  ├─ Save user message
  ├─ Trigger chatbot service
  │   └─ [chatbotService.askChatbot] 
  │       └─ Query RAG, apply confidence gates, generate answer
  ├─ Save bot message (if response received)
  └─ Return both messages
      ↓
Clean API response
```

### 2.2 Bot Message Strategy

- **System Bot User**: Created in `user` table with email `system-bot@learnova.local`
- **User ID**: Set via `SYSTEM_BOT_USER_ID` environment variable
- **Message Type**: `text` (standard message)
- **Graceful Degradation**: If `SYSTEM_BOT_USER_ID` not set, bot replies disabled but chat works normally

---

## 3. Files Created/Modified

### Created Files

| File | Purpose |
|------|---------|
| `src/services/chatService.js` | Core chat logic: message handling, bot integration, context resolution |
| `src/controllers/chatController.js` | HTTP handlers for chat endpoints |
| `src/routes/chatRoutes.js` | Express route definitions |
| `scripts/setupSystemBotUser.js` | One-time setup: creates system bot account |

### Modified Files

| File | Change |
|------|--------|
| `src/app.js` | Added chat routes import and registration |

**Chatbot files**: No changes to existing chatbot logic (preserved as-is)

---

## 4. API Endpoints

All endpoints require JWT authentication (`Authorization: Bearer <token>`).

### 4.1 GET /api/chats/:chatId
**Get chat details with participants**

Request:
```bash
GET /api/chats/1 HTTP/1.1
Authorization: Bearer <jwt>
```

Response:
```json
{
  "message": "Chat retrieved successfully",
  "data": {
    "id": 1,
    "organization_id": 1,
    "created_by": 42,
    "type": "GROUP|PRIVATE",
    "title": "Course Discussion",
    "chat_participants": [
      {
        "user_id": 42,
        "joined_at": "2026-04-05T10:00:00Z"
      }
    ]
  }
}
```

### 4.2 GET /api/chats/:chatId/messages
**Get paginated messages from chat**

Request:
```bash
GET /api/chats/1/messages?limit=20&offset=0 HTTP/1.1
Authorization: Bearer <jwt>
```

Response:
```json
{
  "message": "Messages retrieved successfully",
  "data": {
    "messages": [
      {
        "id": 101,
        "chat_id": 1,
        "sender_user_id": 42,
        "message_type": "text",
        "content": "ما هي دالة التصنيف؟",
        "sent_at": "2026-04-05T10:05:00Z",
        "is_deleted": false,
        "user": { "id": 42, "email": "student@example.com" }
      },
      {
        "id": 102,
        "chat_id": 1,
        "sender_user_id": 0,  # System bot
        "message_type": "text",
        "content": "دالة التصنيف هي...",
        "sent_at": "2026-04-05T10:05:03Z",
        "is_deleted": false,
        "user": { "id": 0, "email": "system-bot@learnova.local" }
      }
    ],
    "total": 200,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### 4.3 POST /api/chats/:chatId/messages
**Send message with optional bot reply**

Request:
```bash
POST /api/chats/1/messages HTTP/1.1
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "content": "ما هي دالة التصنيف في هذه الحصة؟",
  "course_id": 2,
  "subject_id": 2,
  "lesson_id": 4,
  "enable_chatbot": true
}
```

Response:
```json
{
  "message": "Message sent successfully",
  "data": {
    "user_message": {
      "id": 101,
      "chat_id": 1,
      "sender_user_id": 42,
      "content": "ما هي دالة التصنيف في هذه الحصة؟",
      "sent_at": "2026-04-05T10:05:00Z"
    },
    "bot_message": {
      "id": 102,
      "chat_id": 1,
      "sender_user_id": 0,
      "content": "دالة التصنيف هي... [RAG-generated response]",
      "sent_at": "2026-04-05T10:05:03Z"
    },
    "chatbot_response": {
      "answer": "دالة التصنيف هي...",
      "explanation": "تمت الإجابة من نطاق الحصة. الثقة: 0.915.",
      "references": [
        {
          "source_type": "pdf",
          "lesson_id": 4,
          "score": 0.89
        }
      ],
      "confidence": 0.915,
      "scope": "lesson",
      "fallback": false
    }
  }
}
```

**Parameters**:
- `content` (required): Message text (1-5000 characters)
- `message_type` (optional): `text|image|file|voice` (default: `text`)
- `course_id` (optional): Required for chatbot to work
- `subject_id` (optional): Narrows chatbot scope
- `lesson_id` (optional): Highest-priority chatbot scope
- `enable_chatbot` (optional): Toggle bot reply (default: `true`)

**Error Responses**:
- 400: Invalid message content or missing course_id
- 403: User not a participant in chat
- 404: Chat not found
- 413: Message exceeds max length

### 4.4 DELETE /api/chats/:chatId/messages/:messageId
**Soft-delete a message**

Request:
```bash
DELETE /api/chats/1/messages/101 HTTP/1.1
Authorization: Bearer <jwt>
```

Response:
```json
{
  "message": "Message deleted successfully",
  "data": null
}
```

---

## 5. Setup Instructions

### 5.1 Create System Bot User

```bash
# Option 1: Run setup script
docker compose exec api node scripts/setupSystemBotUser.js

# Output:
# [SETUP] ✓ System bot user created successfully
# [SETUP] User ID: 0
# [SETUP] Add this to your .env file:
# [SETUP]   SYSTEM_BOT_USER_ID=0
```

### 5.2 Configure Environment

Add to `.env`:
```env
# System bot user ID (from setup script above)
SYSTEM_BOT_USER_ID=0

# Existing chatbot settings (keep as-is)
RAG_SERVICE_URL=http://rag-service:8000
GROQ_API_KEY=<your-key>
RAG_QUERY_TIMEOUT_MS=10000
```

### 5.3 Restart API

```bash
docker compose restart api
# or
docker compose up -d --build api
```

---

## 6. Test Scenarios

### 6.1 Scenario 1: Send Message Without Bot Reply

**Endpoint**: `POST /api/chats/:chatId/messages`

```bash
curl -X POST http://localhost:5000/api/chats/1/messages \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "مرحبا!",
    "enable_chatbot": false
  }'
```

**Expected**: User message saved, no bot reply

---

### 6.2 Scenario 2: In-Scope Question (Lesson)

**Endpoint**: `POST /api/chats/:chatId/messages`

```bash
curl -X POST http://localhost:5000/api/chats/1/messages \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "ما تعريف القدس كما في الحصة",
    "course_id": 2,
    "subject_id": 2,
    "lesson_id": 4,
    "enable_chatbot": true
  }'
```

**Expected**:
- User message saved
- Chatbot triggered with lesson scope
- Bot reply saved (should have high confidence ~0.9+)
- References included

---

### 6.3 Scenario 3: Out-of-Scope Question

**Endpoint**: `POST /api/chats/:chatId/messages`

```bash
curl -X POST http://localhost:5000/api/chats/1/messages \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "اشرح نظرية الأوتار الفائقة",
    "course_id": 2,
    "subject_id": 2,
    "lesson_id": 4,
    "enable_chatbot": true
  }'
```

**Expected**:
- User message saved
- Chatbot returns refusal
- Bot message saved with refusal text
- Confidence = 0, fallback = false

---

### 6.4 Scenario 4: Unauthorized Access

**Try accessing chat without being participant**

```bash
curl -X POST http://localhost:5000/api/chats/99/messages \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello"
  }'
```

**Expected**: 403 Forbidden - "You do not have access to this chat"

---

### 6.5 Scenario 5: Get Paginated Messages

```bash
curl -X GET "http://localhost:5000/api/chats/1/messages?limit=10&offset=0" \
  -H "Authorization: Bearer <jwt>"
```

**Expected**: Last 10 messages in chronological order with total count

---

## 7. Implementation Details

### 7.1 Message Flow with Chatbot

```javascript
sendMessageWithBotReply({
  chatId: 1,
  userId: 42,
  content: "ما هي دالة التصنيف؟",
  tokenUser: req.user,
  chatbotContext: {
    courseId: 2,
    subjectId: 2,
    lessonId: 4
  },
  enableChatbot: true
})
```

**Steps**:
1. Verify user is participant: `chat_participants.findUnique()`
2. Save user message: `messages.create({ sender_user_id: 42, ... })`
3. Call chatbot: `askChatbot({ question, courseId, subjectId, lessonId, tokenUser })`
4. Save bot reply: `messages.create({ sender_user_id: SYSTEM_BOT_USER_ID, ... })`
5. Return both messages and bot response metadata

### 7.2 Context Resolution

For group chats:
- `course_id` **must** be provided in request (or could be stored on chat)
- `subject_id` and `lesson_id` are optional (control RAG scope narrowness)

For private chats:
- Similar; course context passed explicitly

### 7.3 Graceful Degradation

If `SYSTEM_BOT_USER_ID` is not set:
- Chat system works fully (messages saved, retrieved, deleted)
- Bot replies disabled with warning log
- No errors thrown

---

## 8. Postman Collection Updates

Update `postman/Learnova_Backend.postman_collection.json`:

### Add requests under "Chat" collection:

```json
{
  "name": "Chat",
  "item": [
    {
      "name": "Get Chat Details",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "{{base_url}}/api/chats/1",
          "host": ["{{base_url}}", "api", "chats"],
          "path": ["1"]
        }
      }
    },
    {
      "name": "Get Messages",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "{{base_url}}/api/chats/1/messages?limit=20&offset=0",
          "query": [
            { "key": "limit", "value": "20" },
            { "key": "offset", "value": "0" }
          ]
        }
      },
      "tests": "pm.test('should return paginated messages', function() {\nvar resp = pm.response.json();\npm.expect(resp.data.messages).to.be.an('array');\npm.expect(resp.data).to.have.property('total');\npm.expect(resp.data).to.have.property('hasMore');\n});"
    },
    {
      "name": "Send Message (No Bot)",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Authorization", "value": "Bearer {{token}}"},
          {"key": "Content-Type", "value": "application/json"}
        ],
        "body": {
          "raw": "{\"content\": \"مرحبا!\", \"enable_chatbot\": false}"
        },
        "url": {"raw": "{{base_url}}/api/chats/1/messages"}
      }
    },
    {
      "name": "Send Message (With Bot - Lesson Scope)",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Authorization", "value": "Bearer {{token}}"},
          {"key": "Content-Type", "value": "application/json"}
        ],
        "body": {
          "raw": "{\"content\": \"ما تعريف القدس كما في الحصة\", \"course_id\": 2, \"subject_id\": 2, \"lesson_id\": 4, \"enable_chatbot\": true}"
        },
        "url": {"raw": "{{base_url}}/api/chats/1/messages"}
      },
      "tests": "pm.test('should return user and bot messages', function() {\nvar resp = pm.response.json();\npm.expect(resp.data).to.have.property('user_message');\npm.expect(resp.data).to.have.property('bot_message').or.property('chatbot_response');\n});"
    },
    {
      "name": "Delete Message",
      "request": {
        "method": "DELETE",
        "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
        "url": {"raw": "{{base_url}}/api/chats/1/messages/101"}
      }
    }
  ]
}
```

---

## 9. Database Considerations

### 9.1 No Schema Changes

The implementation uses existing tables:
- `chats` - unchanged
- `chat_participants` - unchanged  
- `messages` - unchanged (system bot uses valid user_id)

### 9.2 Indexes Maintained

Existing indexes on `messages`:
- `(chat_id)` - Fast message filtering
- `(sender_user_id)` - Fast user message lookup
- `(sent_at)` - Fast pagination by timestamp

---

## 10. Logging & Monitoring

### 10.1 Chat Service Logs

```
[CHAT] user message saved (chat_id=1, sender=42)
[CHATBOT] generating reply (question="...", scope=lesson)
[CHATBOT] reply saved (chat_id=1, confidence=0.915)
[CHATBOT] reply skipped (chatbot disabled: SYSTEM_BOT_USER_ID not set)
```

### 10.2 Error Logs

```
[ERROR] Failed to get bot reply: ...
[ERROR] User not participant in chat: chat_id=1, user_id=42
```

---

## 11. Security Rules

✅ **Authentication**: All endpoints require JWT token  
✅ **Authorization**: Verified at controller level (`verifyUserChatAccess`)  
✅ **Message Size**: Limited to 5000 characters  
✅ **Soft Delete**: Messages never hard-deleted (is_deleted flag)  
✅ **No Sensitive Data**: System bot email is non-sensitive identifier  

---

## 12. Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Send message | O(1) | Single write + parallel bot trigger |
| Get messages | O(n) | Paginated (default 20) |
| Delete message | O(1) | Soft delete update |
| **Chatbot call** | **O(RAG)** | ~1-2s, async, non-blocking |

---

## 13. Future Enhancements (Out of Scope)

- Real-time WebSocket messages (noted in AGENTS.md as not in scope)
- File uploads to chat (prepared in schema but not implemented)
- Voice messages with transcription
- Chat search/full-text indexing
- Message reactions/threading
- @ mentions and notifications

---

## 14. Verification Checklist

- [x] Service layer created (`chatService.js`)
- [x] Controller created (`chatController.js`)
- [x] Routes registered (`chatRoutes.js`, added to `app.js`)
- [x] Auth middleware verified
- [x] Chatbot integration complete (no changes to existing logic)
- [x] System bot user strategy documented
- [x] Error handling implemented
- [x] Pagination implemented  
- [x] API response format standardized
- [x] No schema changes required
- [x] Backward compatible
- [x] Graceful degradation (bot optional)

---

## 15. Troubleshooting

**Bot messages not saving?**
- Check: `SYSTEM_BOT_USER_ID` set in `.env`
- Check: System bot user exists in `user` table
- Check: API logs for `[CHATBOT]` messages

**User can't access chat?**
- Check: User is in `chat_participants` table
- Check: JWT token valid
- Check: `chat_id` is correct

**Chatbot not triggering?**
- Check: `enable_chatbot=true` in request
- Check: `course_id` provided
- Check: RAG service running (`curl http://localhost:8000/health`)
- Check: `GROQ_API_KEY` configured

---

**Implementation Complete** ✅

