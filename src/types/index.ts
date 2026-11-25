export type SystemSettings = {
  id: string;
  company_name: string;
  ai_tone: string;
  ai_persona: string;
  response_delay_seconds: number;
  typing_simulation_enabled: boolean;
  max_response_length: 'curto' | 'médio' | 'detalhado';
  forbidden_topics: string;
  escalation_instructions: string;
  whatsapp_phone_number_id: string;
  whatsapp_waba_id: string;
  whatsapp_access_token: string;
  whatsapp_verify_token: string;
  zapi_instance_id?: string;
  zapi_token?: string;
  zapi_client_token?: string;
  ai_provider: 'gemini' | 'openai' | 'groq';
  ai_api_key: string;
  ai_model_name: string;
  is_automation_enabled: boolean;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  description?: string;
  created_at: string;
};

export type FAQ = {
  id: string;
  category_id?: string;
  category?: Category;
  question: string;
  question_variations: string[];
  keywords: string[];
  answer: string;
  media_url?: string;
  media_type?: 'image' | 'document' | 'video' | 'audio';
  media_caption?: string;
  media_filename?: string;
  priority: number;
  is_active: boolean;
  hit_count: number;
  created_at: string;
  updated_at: string;
};

export type KnowledgeItem = {
  id: string;
  title: string;
  content: string;
  section: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Contact = {
  id: string;
  wa_id: string;
  name?: string;
  profile_pic_url?: string;
  is_automation_paused: boolean;
  tags: string[];
  metadata: Record<string, any>;
  created_at: string;
  last_interaction_at: string;
};

export type Conversation = {
  id: string;
  contact_id: string;
  contact?: Contact;
  status: 'active' | 'paused_human' | 'resolved';
  unread_count: number;
  last_message_preview?: string;
  last_message_at: string;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  wa_message_id?: string;
  sender_type: 'contact' | 'ai' | 'agent';
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video';
  content: string;
  media_url?: string;
  media_mime_type?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: Record<string, any>;
  created_at: string;
};

export type SystemLog = {
  id: string;
  event_type: 'webhook_received' | 'ai_generated' | 'whatsapp_sent' | 'error';
  level: 'info' | 'warn' | 'error';
  message: string;
  details?: Record<string, any>;
  created_at: string;
};
