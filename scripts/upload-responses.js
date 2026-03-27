const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Simple CSV parser that handles quoted fields with commas and newlines
function parseCSV(content) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        // End of quoted field
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
      } else if (char === ',') {
        // Field separator
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        // Row separator
        currentRow.push(currentField);
        if (currentRow.length > 1 || currentRow[0] !== '') {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        if (char === '\r') i++; // Skip \n in \r\n
      } else {
        currentField += char;
      }
    }
  }
  
  // Don't forget the last field and row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  
  return rows;
}

async function uploadResponses() {
  const csvPath = path.join(__dirname, '..', 'response_rows.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found:', csvPath);
    process.exit(1);
  }
  
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(content);
  
  if (rows.length < 2) {
    console.error('CSV file is empty or has no data rows');
    process.exit(1);
  }
  
  const headers = rows[0];
  console.log('CSV Headers:', headers);
  console.log('Total rows to process:', rows.length - 1);
  
  // Map headers to column indices
  const colIndex = {};
  headers.forEach((h, i) => colIndex[h.trim()] = i);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    
    // Skip empty rows
    if (row.length < 3 || !row[colIndex['call_id']]) {
      console.log(`Skipping row ${i}: empty or missing call_id`);
      continue;
    }
    
    try {
      // Parse JSON fields
      let details = null;
      let analytics = null;
      
      const detailsRaw = row[colIndex['details']];
      const analyticsRaw = row[colIndex['analytics']];
      
      if (detailsRaw && detailsRaw.trim()) {
        try {
          details = JSON.parse(detailsRaw);
        } catch (e) {
          console.warn(`Row ${i}: Failed to parse details JSON`);
        }
      }
      
      if (analyticsRaw && analyticsRaw.trim()) {
        try {
          analytics = JSON.parse(analyticsRaw);
        } catch (e) {
          console.warn(`Row ${i}: Failed to parse analytics JSON`);
        }
      }
      
      const record = {
        // Don't include 'id' - let Supabase auto-generate
        created_at: row[colIndex['created_at']] || null,
        interview_id: row[colIndex['interview_id']] || null,
        name: row[colIndex['name']] || null,
        email: row[colIndex['email']] || null,
        call_id: row[colIndex['call_id']],
        candidate_status: row[colIndex['candidate_status']] || null,
        duration: row[colIndex['duration']] ? parseInt(row[colIndex['duration']]) : null,
        details: details,
        analytics: analytics,
        is_analysed: row[colIndex['is_analysed']] === 'true',
        is_ended: row[colIndex['is_ended']] === 'true',
        is_viewed: row[colIndex['is_viewed']] === 'true',
        tab_switch_count: row[colIndex['tab_switch_count']] ? parseInt(row[colIndex['tab_switch_count']]) : 0,
        profile_id: row[colIndex['profile_id']] || null,
        profile_type: row[colIndex['profile_type']] || null,
      };
      
      // Check if record already exists
      const { data: existing } = await supabase
        .from('response')
        .select('id')
        .eq('call_id', record.call_id)
        .single();
      
      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('response')
          .update(record)
          .eq('call_id', record.call_id);
        
        if (error) {
          console.error(`Row ${i} (update): ${error.message}`);
          errorCount++;
        } else {
          console.log(`Row ${i}: Updated call_id ${record.call_id}`);
          successCount++;
        }
      } else {
        // Insert new record
        const { error } = await supabase
          .from('response')
          .insert(record);
        
        if (error) {
          console.error(`Row ${i} (insert): ${error.message}`);
          errorCount++;
        } else {
          console.log(`Row ${i}: Inserted call_id ${record.call_id}`);
          successCount++;
        }
      }
    } catch (err) {
      console.error(`Row ${i}: ${err.message}`);
      errorCount++;
    }
  }
  
  console.log('\n=== Upload Complete ===');
  console.log(`Success: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
}

uploadResponses().catch(console.error);

