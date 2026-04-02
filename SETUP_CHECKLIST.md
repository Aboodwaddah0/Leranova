# Setup Checklist - OAuth & Email Code Authentication

## Phase 1: Configuration (Before Running Containers)

### Google OAuth Setup

- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Create new project (if needed)
- [ ] Enable "Google+ API"
- [ ] Go to "Credentials" > "Create Credentials" > "OAuth 2.0 Client ID"
- [ ] Choose "Web application"
- [ ] Add Authorized redirect URIs:
  - [ ] `http://localhost:5000/api/auth/google/callback` (development)
  - [ ] `https://yourdomain.com/api/auth/google/callback` (production)
- [ ] Copy Client ID and Client Secret

### Email Service Setup (Choose One)

#### Option A: Gmail SMTP

- [ ] Enable 2-Step Verification on Google Account
- [ ] Go to Security settings
- [ ] Generate "App passwords"
- [ ] Use generated password as `EMAIL_PASSWORD`

#### Option B: SendGrid

- [ ] Create SendGrid account
- [ ] Generate API key
- [ ] Use SendGrid SMTP details

#### Option C: Custom SMTP

- [ ] Obtain SMTP credentials from your email provider
- [ ] Have: HOST, PORT, USER, PASSWORD

### Environment Setup

- [ ] Copy `.env.example` to `.env`
- [ ] Fill in all OAuth variables:
  - [ ] GOOGLE_CLIENT_ID
  - [ ] GOOGLE_CLIENT_SECRET
  - [ ] GOOGLE_CALLBACK_URL
- [ ] Fill in email variables:
  - [ ] EMAIL_HOST
  - [ ] EMAIL_PORT
  - [ ] EMAIL_USER
  - [ ] EMAIL_PASSWORD
  - [ ] EMAIL_FROM
- [ ] Set SESSION_SECRET to a random string
- [ ] Set NODE_ENV to "development" or "production"

## Phase 2: Database Setup

### Run Migrations

- [ ] Start Docker containers: `docker compose up -d --build`
- [ ] Verify database is running: `docker ps`
- [ ] Check migration status: Visit http://localhost:5000/health
- [ ] Check database logs for any errors: `docker logs <container_name>`

### Verify Database Changes

```bash
# Connect to MySQL
docker exec -it <db-container> mysql -u root -p learnova_db

# Check new tables/fields
DESCRIBE user;           # Should show oauthProvider, oauthId
DESCRIBE organization;   # Should show oauthProvider, oauthId
DESCRIBE login_code;     # Should exist
```

## Phase 3: Application Testing

### Test Email Connection

```bash
# Add this temporarily to verify email works
# In src/app.js or a test route, call:
# import { testEmailConnection } from './services/emailService.js';
# await testEmailConnection();
```

### Test OAuth Flow

1. [ ] Navigate to frontend
2. [ ] Click "Login with Google"
3. [ ] Should redirect to Google OAuth
4. [ ] After login, should redirect to callback URL
5. [ ] Check database - organization should be created with PENDING status

### Test Email Code Flow

1. [ ] Request login code:

```bash
curl -X POST http://localhost:5000/api/auth/request-login-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "role": "STUDENT"
  }'
```

2. [ ] Check email for 6-digit code
3. [ ] Verify code:

```bash
curl -X POST http://localhost:5000/api/auth/verify-login-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "code": "123456",
    "role": "STUDENT"
  }'
```

4. [ ] Should receive JWT token in response

## Phase 4: Frontend Integration

### Basic Setup

- [ ] Import frontend integration helpers from `FRONTEND_INTEGRATION.md`
- [ ] Add login form with email + role selector
- [ ] Add code input field (hidden until code sent)
- [ ] Add Google OAuth button

### React Setup (if using React)

- [ ] Copy React example from `FRONTEND_INTEGRATION.md`
- [ ] Adjust component styling
- [ ] Test both OAuth and email code flows

### Vue Setup (if using Vue)

- [ ] Copy Vue example from `FRONTEND_INTEGRATION.md`
- [ ] Adjust component styling
- [ ] Test both OAuth and email code flows

## Phase 5: Production Deployment

### Security Hardening

- [ ] Change SESSION_SECRET to strong random string
- [ ] Set NODE_ENV to "production"
- [ ] Update GOOGLE_CALLBACK_URL for production domain
- [ ] Enable SSL/HTTPS
- [ ] Update session cookie settings:
  ```javascript
  secure: true,     // Only send over HTTPS
  httpOnly: true,   // Not accessible from JavaScript
  sameSite: 'strict' // CSRF protection
  ```
- [ ] Implement CORS properly for frontend domain

### Email Configuration

- [ ] Switch to production email service
- [ ] Update EMAIL_FROM with branded address
- [ ] Test email delivery to production domains
- [ ] Monitor bounce rates

### Database

- [ ] Backup production database before migration
- [ ] Test migrations on staging first
- [ ] Verify all fields created correctly
- [ ] Monitor query performance

### Monitoring

- [ ] Set up logging for OAuth errors
- [ ] Monitor email delivery
- [ ] Track failed login attempts
- [ ] Set up alerts for failed email sends

## Common Issues & Solutions

| Issue                                 | Solution                                                          |
| ------------------------------------- | ----------------------------------------------------------------- |
| "Email already registered"            | Check if user exists with email before OAuth                      |
| Gmail showing "App password required" | Use specific app password, not main password                      |
| OAuth redirect mismatch               | Ensure GOOGLE_CALLBACK_URL exactly matches Google Console setting |
| Email not received                    | Check SMTP firewall access, verify credentials, check spam folder |
| Token verification failing            | Ensure JWT_SECRET is same across all instances                    |
| Login code expired                    | Increase EXPIRY_MINUTES in loginCodeService.js if needed          |

## File References

- **Complete Documentation**: `OAUTH_EMAIL_IMPLEMENTATION.md`
- **Frontend Examples**: `FRONTEND_INTEGRATION.md`
- **API Reference**: See endpoints in main documentation
- **.env Template**: `.env.example`
- **Database Schema**: `prisma/schema.prisma`
- **Services**:
  - Email: `src/services/emailService.js`
  - Codes: `src/services/loginCodeService.js`
  - Auth: `src/services/authService.js`
  - OAuth: `src/config/oauth.js`
- **Controllers**: `src/controllers/authController.js`
- **Routes**: `src/routes/authRoutes.js`

## Support & Debugging

1. **Check logs**: `docker logs <service-name>`
2. **View database**: Connect to MySQL and query tables
3. **Test API**: Use Postman or curl commands provided
4. **Email testing**: Forward link an app-password generator or use Mailtrap for testing
5. **OAuth debugging**: Check Google Cloud Console project logs

## Next: Scale to Multiple Providers

To add more OAuth providers:

1. Install provider package (e.g., `passport-github`)
2. Create strategy in `src/config/oauth.js`
3. Add route in `authRoutes.js`
4. Add controller method in `authController.js`
5. Update docs

---

**Implementation Status**: ✅ Complete
**Last Updated**: April 2, 2026
**Ready for**: Development Testing → Staging → Production
