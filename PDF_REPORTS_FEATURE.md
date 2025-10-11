# PDF Reports Feature

## Overview
This feature adds comprehensive PDF download functionality for candidate interview reports. Users can now download beautifully formatted PDF reports for individual candidates, and the "Download All" feature generates separate PDFs for each candidate.

## Features Implemented

### 1. Individual Candidate PDF Reports
- **Location**: Available on the individual candidate response view (`CallInfo` component)
- **Button**: Orange "Download PDF" button with a file icon in the top-right area
- **Single-Page Optimized**: Reports are designed to fit all information on one page
- **Includes**:
  - Candidate information (name, email)
  - **Clickable resource links**:
    - 🎧 Listen to Recording (direct link to audio)
    - 📄 Download Full Transcript (direct link to transcript)
  - Performance scores (Overall Hiring Score, Communication Score)
  - Overall summary and communication analysis
  - Question analysis with AI-generated summaries for each question
  - Compact, professional formatting with orange branding
- **Note**: Tab switching information is NOT included in reports (kept private)

### 2. Download All Candidates Reports
- **Locations**: 
  - Main interview page header (orange icon button with tooltip)
  - Summary view page (orange "Download All Reports" button)
- **Behavior**: Generates individual PDF reports for each candidate and **downloads them as a ZIP file**
- **Features**:
  - Each candidate gets their own separate PDF file inside the zip
  - Single zip file download: `[InterviewName]_All_Candidates_Reports.zip`
  - Each PDF follows the same single-page optimized format as individual downloads
  - Includes recording and transcript links for each candidate
  - Clean file naming (special characters replaced with underscores)

## Technical Details

### Dependencies Added
- `jspdf` - Core PDF generation library
- `jspdf-autotable` - Table generation for PDFs (minimal use now)
- `@types/jspdf` - TypeScript types
- `jszip` - Create zip files for bulk downloads

### Files Created/Modified

#### New Files:
1. **`src/lib/pdf-generator.ts`** - Core PDF generation utilities
   - `generateIndividualCandidatePDF()` - Creates single candidate report
   - `generateAllCandidatesPDF()` - Creates combined report for all candidates
   - Helper functions for formatting and pagination

#### Modified Files:
1. **`src/components/call/callInfo.tsx`**
   - Added "Download PDF" button for individual candidate reports
   - Integrated PDF generation with error handling and toast notifications

2. **`src/app/(client)/interviews/[interviewId]/page.tsx`**
   - Added icon button in header for downloading all candidates report
   - Proper tooltip and disabled state when no candidates exist

3. **`src/components/dashboard/interview/summaryInfo.tsx`**
   - Added "Download All Reports" button in the summary view
   - Consistent error handling and user feedback

## PDF Report Structure

### Individual Candidate Report (Single Page):
1. **Header Section** (Orange branded - #F97316)
   - Title: "Candidate Report"
   - Interview name

2. **Candidate Information** (Compact)
   - Name and email
   - **No tab switching information shown**
   - Resources (inline): Listen to Recording | Download Transcript

3. **General Summary Section**
   - **Circular progress charts** (side by side):
     - Overall Hiring Score (out of 100) - with orange circular progress
     - Communication Score (out of 10) - with orange circular progress
   - Feedback text below charts
   - Communication analysis
   - User Sentiment
   - Call Summary

4. **Question Analysis** (Compact)
   - Each question with its summary
   - Tight spacing to fit on one page

5. **Footer**
   - Page 1
   - Generation date

### Download All Candidates:
- Generates **separate individual PDFs** for each candidate
- All PDFs are **packaged into a single ZIP file**
- ZIP file name: `[InterviewName]_All_Candidates_Reports.zip`
- Each PDF follows the same single-page structure above
- Individual PDF names: `[CandidateName]_Report.pdf`

## User Experience

### Success Notifications
- Toast notifications confirm successful PDF generation
- Files are automatically downloaded to the user's downloads folder

### Error Handling
- Graceful error messages if PDF generation fails
- Button is disabled when no candidates exist
- Validation before attempting to generate reports

### File Naming
- Individual reports: `[CandidateName]_Report.pdf`
- All candidates ZIP: `[InterviewName]_All_Candidates_Reports.zip`
  - Contains: `[CandidateName]_Report.pdf` for each candidate

## Styling & Design
- **Orange color scheme** (#F97316 - orange-500) for headers, charts, and links
- Orange buttons throughout the interface
- **Circular progress charts** matching the web UI design
- Single-page optimized layout
- Readable fonts (Helvetica) with smaller sizes for compactness
- Proper text wrapping for long content
- Clickable inline links for recording and transcript access

## Testing Recommendations
1. Test with candidates that have complete analytics data
2. Test with candidates missing some fields (should handle gracefully)
3. Test with long text content (should wrap properly on single page)
4. Test downloading when no candidates exist (should show error)
5. Test "Download All" with multiple candidates (creates ZIP file)
6. Verify circular progress charts render correctly in PDFs
7. Verify clickable links work in PDFs (recording and transcript)
8. Confirm tab switching data is NOT shown in PDFs
9. Test single-page layout with various amounts of content
10. Verify ZIP extraction and individual PDF quality

## Key Features Summary
✅ **Single-page optimized reports** - All content fits on one page
✅ **Orange branding** - Consistent with new color scheme
✅ **Circular progress charts** - Visual score indicators matching web UI
✅ **Clickable links** - Direct access to recording and transcript
✅ **Privacy protection** - Tab switching data excluded from reports
✅ **ZIP download** - "Download All" creates a ZIP file with all PDFs
✅ **Professional formatting** - Clean, compact, easy to read

## Future Enhancements (Optional)
- Add company logo to PDF header
- Allow customization of PDF theme colors
- Add option to select specific candidates for bulk download
- Add charts/graphs for visual data representation
- Option to generate a summary overview PDF of all candidates

