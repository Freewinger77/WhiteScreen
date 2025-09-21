# LinkedIn OAuth Integration Setup

## Overview
This implementation adds LinkedIn OAuth authentication to the interview process, allowing candidates to sign in with LinkedIn and auto-populate their name and email fields.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install next-auth
```

### 2. Environment Variables
Add these variables to your `.env.local` file:

```env
# LinkedIn OAuth Configuration
LINKEDIN_CLIENT_ID=78ikzrty6iaist
LINKEDIN_CLIENT_SECRET=WPL_AP1.DJtx39ow7HReDlv6.s/48FA==

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-change-in-production
```

### 3. Database Migration
Run this SQL command in your Supabase SQL Editor to add the new columns:

```sql
ALTER TABLE response 
ADD COLUMN profile_id TEXT,
ADD COLUMN profile_type TEXT;
```

### 4. LinkedIn App Configuration
In your LinkedIn Developer Console:
1. Go to https://www.linkedin.com/developers/apps
2. Select your app or create a new one
3. Add these redirect URLs:
   - `http://localhost:3000/api/auth/callback/linkedin` (for development)
   - `https://yourdomain.com/api/auth/callback/linkedin` (for production)
4. Ensure these scopes are enabled:
   - `openid`
   - `profile` 
   - `email`

## Features Implemented

### 1. LinkedIn Sign-in Button
- Prominent blue LinkedIn button with official branding
- Fallback to manual email/name entry
- Clear visual separation with "or enter manually" divider

### 2. Auto-populated Fields
- Name and email automatically filled from LinkedIn profile
- Fields are greyed out when populated from LinkedIn
- LinkedIn branding indicator shows data source

### 3. Edit Functionality
- Small edit buttons (pencil icon) next to each field
- Click to enable editing of LinkedIn-populated data
- Fields become editable with normal styling when clicked

### 4. Database Integration
- `profile_id`: Stores LinkedIn's unique identifier (`sub` field)
- `profile_type`: Set to 'linkedin' for LinkedIn users, null for manual entry
- Existing `name`, `email`, and `cv_url` fields work as before

### 5. Practice Session Support
- LinkedIn data persists through practice sessions
- Edit functionality available in post-practice form
- Consistent UI across all interview stages

## User Flow

### Without LinkedIn
1. User sees LinkedIn sign-in button
2. Can choose to sign in with LinkedIn OR enter manually
3. Manual entry works exactly as before

### With LinkedIn
1. User clicks "Sign in with LinkedIn"
2. Redirected to LinkedIn OAuth flow
3. Returns with name/email auto-populated and greyed out
4. Can click edit buttons to modify if needed
5. Data includes LinkedIn profile ID for future reference

## Technical Details

### Files Modified
- `src/components/call/index.tsx` - Main interview component with LinkedIn UI
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth configuration
- `src/app/(user)/layout.tsx` - Added SessionProvider wrapper
- `supabase_schema.sql` - Added profile_id and profile_type columns
- `src/types/next-auth.d.ts` - TypeScript definitions for LinkedIn data

### Data Flow
1. LinkedIn OAuth returns user profile data
2. `profile.sub` becomes `profile_id` in database
3. `profile.name` auto-fills name field (editable)
4. `profile.email` auto-fills email field (editable)
5. Profile type set to 'linkedin' for tracking

### Security & Privacy
- OAuth 2.0 + OpenID Connect standard security
- Only requests minimal required scopes (openid, profile, email)
- LinkedIn profile ID stored for future reference/deduplication
- Users can still edit/override LinkedIn data if needed

## Testing
1. Start development server: `npm run dev`
2. Navigate to an interview link
3. Try LinkedIn sign-in flow
4. Verify fields auto-populate and edit functionality works
5. Check database records include profile_id and profile_type

## Production Deployment
1. Update `NEXTAUTH_URL` to your production domain
2. Add production redirect URL to LinkedIn app settings
3. Generate secure `NEXTAUTH_SECRET` for production
4. Test OAuth flow on production environment

