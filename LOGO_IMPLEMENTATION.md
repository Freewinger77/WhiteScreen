# Logo Integration Implementation

## Overview
Your interview platform now automatically integrates with Clerk organization logos, with the ability to override with custom logos per interview. The system **dynamically fetches the latest organization logo** so updates to your Clerk organization logo are reflected immediately across all interviews.

## What's Implemented

### 1. **Automatic Clerk Organization Logo Integration**
- When creating a new interview, the system automatically pulls the logo from your Clerk organization (`organization.imageUrl`)
- This logo is pre-populated in the logo uploader, so you can see it immediately
- If your organization doesn't have a logo set in Clerk, the upload field remains empty

### 2. **Create Interview Flow** (`src/components/dashboard/interview/create-popup/details.tsx`)
- ✅ Organization logo automatically loads when you open the create interview modal
- ✅ Logo preview shows the organization logo by default
- ✅ You can upload a custom logo to override the organization logo
- ✅ Helpful text indicates whether you're using the org logo or a custom one

### 3. **Edit Interview Flow** (`src/components/dashboard/interview/editInterview.tsx`)
- ✅ Shows existing custom logo if one was uploaded
- ✅ Falls back to organization logo if no custom logo is set
- ✅ You can add, change, or remove the custom logo
- ✅ Removing a custom logo reverts to the organization logo
- ✅ Clear messaging about which logo is being used

### 4. **Interview Call Page** (`src/components/call/index.tsx`)
- ✅ Displays the interview's logo (either custom or organization logo)
- ✅ Logo appears in a rounded container with shadow effects
- ✅ Falls back to UserIcon SVG only if no logo is available at all
- ✅ Logo is prominently displayed at the top of the interview page

### 5. **Backend Integration**
- ✅ `/api/create-interview` - Handles logo upload and storage
- ✅ `/api/interviews/[id]` - Updates logos and manages file cleanup
- ✅ Storage service uploads logos to Supabase Storage
- ✅ Database stores logo URLs in the `logo_url` field

## 🔥 Key Feature: Dynamic Logo Updates

**When you update your Clerk organization logo, all existing interviews automatically display the new logo!**

The system distinguishes between:
- **Custom logos** - Uploaded files stored in Supabase (never change automatically)
- **Organization logos** - Fetched dynamically from your synced database (always up-to-date)

This means:
- ✅ Update your Clerk org logo → All interviews with NO custom logo show the new logo instantly
- ✅ Interviews with custom logos keep their custom logo (as intended)
- ✅ No need to manually update each interview

## How It Works

### For New Interviews:
1. You click "Create Interview"
2. Modal opens with your organization logo already displayed
3. You can either:
   - Keep the organization logo (do nothing)
   - Upload a custom logo to override it
4. When you save, the appropriate logo URL is stored

### For Editing Interviews:
1. Open an existing interview
2. Click the edit button
3. You'll see:
   - The custom logo if one was set
   - The organization logo if no custom logo exists
4. You can:
   - Upload a new custom logo
   - Remove the custom logo (reverts to org logo)
   - Keep the existing logo

### For Interview Respondents:
1. Candidates open the interview link
2. They see the logo prominently displayed:
   - Custom logo if you uploaded one
   - Organization logo from Clerk if no custom logo
   - Generic user icon only if neither exists
3. Professional, branded experience for all respondents

## Technical Details

### Logo Priority (in order):
1. **Custom uploaded logo** - If you upload a file to Supabase, it takes highest priority (stored permanently)
2. **Organization logo from database** - Dynamically fetched from your organization record (synced with Clerk)
3. **UserIcon SVG** - Default fallback if neither exists

### How Dynamic Updates Work:
1. Whenever you access the dashboard or interview pages, your organization's `image_url` in the database is synced with Clerk's latest logo
2. On the interview call page, if no custom logo exists, the system fetches the current organization logo from the database
3. This means changes to your Clerk org logo propagate to all non-custom interviews within seconds!

### Storage:
- Custom logos are uploaded to Supabase Storage
- Stored in: `interviews/{interview_id}/{timestamp}-{filename}`
- Organization logos remain as Clerk CDN URLs (no redundant storage)
- Old logos are automatically cleaned up when replaced

### Database Schema:
The `interview` table already has the `logo_url` field:
```sql
logo_url TEXT
```

## Usage Instructions

### Setting Your Organization Logo in Clerk:
1. Go to your Clerk Dashboard
2. Navigate to your Organization settings
3. Upload an organization logo
4. This logo will automatically appear in all new interviews

### Overriding with Custom Logo:
1. When creating or editing an interview
2. Click "Upload logo" in the logo section
3. Select an image file (PNG, JPG, or SVG up to 2MB)
4. The custom logo will override the organization logo for this specific interview

### Removing Custom Logo:
1. Edit the interview
2. Click "Remove logo"
3. The system will revert to using the organization logo from Clerk

## Files Modified

1. **src/services/clients.service.ts**
   - Updated `getOrganizationById()` to sync `image_url` from Clerk
   - Added `getOrganizationLogoById()` to fetch org logo for any interview
   - Auto-syncs organization logo whenever you use the dashboard

2. **src/components/call/index.tsx**
   - Added dynamic organization logo fetching
   - Uses `isCustomLogoUpload()` to distinguish custom vs org logos
   - Fetches latest org logo for non-custom interviews
   - Falls back gracefully through: Custom Logo → Org Logo → UserIcon

3. **src/lib/storage.ts**
   - Added `isCustomLogoUpload()` utility function
   - Checks if a logo URL is from Supabase storage (custom) or external (Clerk/org)

4. **src/contexts/clients.context.tsx**
   - Updated to pass `organization.imageUrl` to sync function
   - Keeps organization logo synced with Clerk

5. **src/app/(client)/dashboard/page.tsx**
   - Updated to pass organization name and imageUrl to sync function

6. **src/app/(client)/interviews/[interviewId]/page.tsx**
   - Updated to pass organization name and imageUrl to sync function

7. **src/components/dashboard/interview/create-popup/details.tsx**
   - Added `useOrganization()` hook from Clerk
   - Auto-populate logo from `organization.imageUrl`
   - Updated UI text to indicate logo source

8. **src/components/dashboard/interview/editInterview.tsx**
   - Added `useOrganization()` hook from Clerk
   - Show org logo as fallback in preview
   - Updated save logic to preserve org logo when custom logo removed
   - Improved UI messaging

9. **src/components/dashboard/interview/create-popup/questions.tsx**
   - Already had fallback to `organization.imageUrl` (line 93)
   - No changes needed (already implemented!)

## Testing Checklist

- [ ] **Test Dynamic Update**: 
  1. Create an interview without custom logo
  2. Open the interview call page - note the logo
  3. Go to Clerk and update your organization logo
  4. Visit any dashboard page (to trigger sync)
  5. Refresh the interview call page - new logo should appear! 🎉
  
- [ ] Create a new interview - verify org logo appears automatically
- [ ] Upload a custom logo - verify it overrides org logo
- [ ] Save and view interview call page - verify logo displays
- [ ] Edit interview - verify correct logo shows
- [ ] Remove custom logo - verify reverts to org logo (current Clerk logo)
- [ ] Test with org that has no Clerk logo - verify works gracefully
- [ ] Test logo upload with different file types (PNG, JPG, SVG)
- [ ] Verify old logos are cleaned up when replaced
- [ ] Create interview with custom logo, update Clerk org logo - verify custom logo stays

## Notes

- Maximum logo file size: 2MB
- Supported formats: PNG, JPG, SVG
- Logo displays at 64x64px on call page
- Logo aspect ratio is preserved (object-contain)
- Organization logos from Clerk are not re-uploaded to your storage (efficient!)

