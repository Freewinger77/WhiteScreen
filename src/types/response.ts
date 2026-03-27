export interface Response {
  id: bigint;
  created_at: Date;
  name: string | null;
  interview_id: string;
  duration: number;
  call_id: string;
  details: any; // Contains attached_cv: { text, url, fileName }, linkedin_url, github_url if provided
  is_analysed: boolean;
  email: string;
  is_ended: boolean;
  is_viewed: boolean;
  analytics: any;
  candidate_status: string;
  tab_switch_count: number;
  tab_switch_events?: Array<{ timestamp: number; duration: number }> | null;
  // Profile info - stores LinkedIn or GitHub URL
  profile_id?: string | null;
  profile_type?: string | null; // "linkedin" | "github"
  // CV URL (stored in Supabase 'candidate-cvs' bucket)
  cv_url?: string | null;
  // Client-side recorded video URL (stored in Supabase 'videos' bucket)
  video_url?: string | null;
}

// Individual custom metric score result
export interface CustomMetricScore {
  metricId: string;
  title: string;
  score: number; // Score from 0-10 for scale, 1 or 10 for boolean
  feedback: string;
  weight: number; // Original weight for reference
  type: "scale" | "boolean"; // Metric type
}

export interface Analytics {
  overallScore: number;
  overallFeedback: string;
  communication: { score: number; feedback: string };
  generalIntelligence: string;
  softSkillSummary: string;
  questionSummaries: Array<{
    question: string;
    summary: string;
  }>;
  // Custom metrics scores (when custom metrics are defined)
  customMetrics?: CustomMetricScore[];
  // Weighted overall score (calculated from custom metrics when available)
  weightedOverallScore?: number;
}

export interface FeedbackData {
  interview_id: string;
  satisfaction: number | null;
  feedback: string | null;
  email: string | null;
}

export interface CallData {
  call_id: string;
  agent_id: string;
  audio_websocket_protocol: string;
  audio_encoding: string;
  sample_rate: number;
  call_status: string;
  end_call_after_silence_ms: number;
  from_number: string;
  to_number: string;
  metadata: Record<string, unknown>;
  retell_llm_dynamic_variables: {
    customer_name: string;
  };
  drop_call_if_machine_detected: boolean;
  opt_out_sensitive_data_storage: boolean;
  start_timestamp: number;
  end_timestamp: number;
  transcript?: string;
  // CV upload specific fields
  details?: {
    source?: string;
    fileName?: string;
    cvText?: string;
    extractedInfo?: {
      name?: string;
      email?: string;
      phone?: string;
    };
    call_analysis?: {
      call_summary?: string;
      user_sentiment?: string;
    };
  };
  transcript_object: {
    role: "agent" | "user";
    content: string;
    words: {
      word: string;
      start: number;
      end: number;
    }[];
  }[];
  transcript_with_tool_calls: {
    role: "agent" | "user";
    content: string;
    words: {
      word: string;
      start: number;
      end: number;
    }[];
  }[];
  recording_url: string;
  public_log_url: string;
  e2e_latency: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    max: number;
    min: number;
    num: number;
  };
  llm_latency: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    max: number;
    min: number;
    num: number;
  };
  llm_websocket_network_rtt_latency: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    max: number;
    min: number;
    num: number;
  };
  disconnection_reason: string;
  call_analysis: {
    call_summary: string;
    user_sentiment: string;
    agent_sentiment: string;
    agent_task_completion_rating: string;
    agent_task_completion_rating_reason: string;
    call_completion_rating: string;
    call_completion_rating_reason: string;
  };
}
