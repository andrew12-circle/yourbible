export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          book: string
          chapter: number
          created_at: string
          id: string
          messages: Json
          updated_at: string
          user_id: string
          verse: number
        }
        Insert: {
          book: string
          chapter: number
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
          user_id: string
          verse: number
        }
        Update: {
          book?: string
          chapter?: number
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
          user_id?: string
          verse?: number
        }
        Relationships: []
      }
      artifact_claims: {
        Row: {
          artifact_id: string
          bias_flags: string[]
          claim: string
          created_at: string
          doctrine_tags: string[]
          embedding: string | null
          id: string
          match_relation: string | null
          matched_belief_id: string | null
          scripture_challenges: Json
          scripture_supports: Json
          tone: string | null
          user_id: string
          user_note: string | null
          verdict: string | null
        }
        Insert: {
          artifact_id: string
          bias_flags?: string[]
          claim: string
          created_at?: string
          doctrine_tags?: string[]
          embedding?: string | null
          id?: string
          match_relation?: string | null
          matched_belief_id?: string | null
          scripture_challenges?: Json
          scripture_supports?: Json
          tone?: string | null
          user_id: string
          user_note?: string | null
          verdict?: string | null
        }
        Update: {
          artifact_id?: string
          bias_flags?: string[]
          claim?: string
          created_at?: string
          doctrine_tags?: string[]
          embedding?: string | null
          id?: string
          match_relation?: string | null
          matched_belief_id?: string | null
          scripture_challenges?: Json
          scripture_supports?: Json
          tone?: string | null
          user_id?: string
          user_note?: string | null
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artifact_claims_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifact_claims_matched_belief_id_fkey"
            columns: ["matched_belief_id"]
            isOneToOne: false
            referencedRelation: "belief_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      artifact_moments: {
        Row: {
          artifact_id: string
          body: string | null
          created_at: string
          end_seconds: number | null
          id: string
          kind: string
          label: string | null
          start_seconds: number
          user_id: string
        }
        Insert: {
          artifact_id: string
          body?: string | null
          created_at?: string
          end_seconds?: number | null
          id?: string
          kind: string
          label?: string | null
          start_seconds: number
          user_id: string
        }
        Update: {
          artifact_id?: string
          body?: string | null
          created_at?: string
          end_seconds?: number | null
          id?: string
          kind?: string
          label?: string | null
          start_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artifact_moments_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      artifacts: {
        Row: {
          created_at: string
          error: string | null
          id: string
          kind: string
          metadata: Json
          processing_token: string | null
          raw_text: string
          status: string
          title: string | null
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          kind: string
          metadata?: Json
          processing_token?: string | null
          raw_text: string
          status?: string
          title?: string | null
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          metadata?: Json
          processing_token?: string | null
          raw_text?: string
          status?: string
          title?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      belief_links: {
        Row: {
          a_id: string
          b_id: string
          created_at: string
          id: string
          relation: string
          user_id: string
        }
        Insert: {
          a_id: string
          b_id: string
          created_at?: string
          id?: string
          relation?: string
          user_id: string
        }
        Update: {
          a_id?: string
          b_id?: string
          created_at?: string
          id?: string
          relation?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "belief_links_a_id_fkey"
            columns: ["a_id"]
            isOneToOne: false
            referencedRelation: "belief_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "belief_links_b_id_fkey"
            columns: ["b_id"]
            isOneToOne: false
            referencedRelation: "belief_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      belief_nodes: {
        Row: {
          answer: string | null
          confidence: number
          core_scope: string | null
          created_at: string
          embedding: string | null
          id: string
          is_core: boolean
          layer: string
          notes: string | null
          statement: string
          tags: string[]
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          confidence?: number
          core_scope?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          is_core?: boolean
          layer: string
          notes?: string | null
          statement: string
          tags?: string[]
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string | null
          confidence?: number
          core_scope?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          is_core?: boolean
          layer?: string
          notes?: string | null
          statement?: string
          tags?: string[]
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      belief_scriptures: {
        Row: {
          belief_id: string
          created_at: string
          id: string
          ref: string
          role: string
          user_id: string
        }
        Insert: {
          belief_id: string
          created_at?: string
          id?: string
          ref: string
          role?: string
          user_id: string
        }
        Update: {
          belief_id?: string
          created_at?: string
          id?: string
          ref?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "belief_scriptures_belief_id_fkey"
            columns: ["belief_id"]
            isOneToOne: false
            referencedRelation: "belief_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      belief_sources: {
        Row: {
          artifact_id: string | null
          avatar_url: string | null
          belief_id: string
          created_at: string
          id: string
          label: string
          metadata: Json
          source_type: string
          user_id: string
        }
        Insert: {
          artifact_id?: string | null
          avatar_url?: string | null
          belief_id: string
          created_at?: string
          id?: string
          label: string
          metadata?: Json
          source_type: string
          user_id: string
        }
        Update: {
          artifact_id?: string | null
          avatar_url?: string | null
          belief_id?: string
          created_at?: string
          id?: string
          label?: string
          metadata?: Json
          source_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "belief_sources_belief_id_fkey"
            columns: ["belief_id"]
            isOneToOne: false
            referencedRelation: "belief_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      belief_tensions: {
        Row: {
          a_id: string
          b_id: string
          created_at: string
          explanation: string | null
          id: string
          layer: string | null
          severity: number
          status: string
          suggested_resolution: string | null
          summary: string
          updated_at: string
          user_id: string
        }
        Insert: {
          a_id: string
          b_id: string
          created_at?: string
          explanation?: string | null
          id?: string
          layer?: string | null
          severity?: number
          status?: string
          suggested_resolution?: string | null
          summary: string
          updated_at?: string
          user_id: string
        }
        Update: {
          a_id?: string
          b_id?: string
          created_at?: string
          explanation?: string | null
          id?: string
          layer?: string | null
          severity?: number
          status?: string
          suggested_resolution?: string | null
          summary?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      belief_versions: {
        Row: {
          belief_id: string
          created_at: string
          id: string
          snapshot: Json
          user_id: string
        }
        Insert: {
          belief_id: string
          created_at?: string
          id?: string
          snapshot: Json
          user_id: string
        }
        Update: {
          belief_id?: string
          created_at?: string
          id?: string
          snapshot?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "belief_versions_belief_id_fkey"
            columns: ["belief_id"]
            isOneToOne: false
            referencedRelation: "belief_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          book: string
          chapter: number
          color: string
          created_at: string
          id: string
          label: string
          position: number
          updated_at: string
          user_id: string
          verse: number | null
        }
        Insert: {
          book: string
          chapter: number
          color: string
          created_at?: string
          id?: string
          label: string
          position: number
          updated_at?: string
          user_id: string
          verse?: number | null
        }
        Update: {
          book?: string
          chapter?: number
          color?: string
          created_at?: string
          id?: string
          label?: string
          position?: number
          updated_at?: string
          user_id?: string
          verse?: number | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          mode: string
          target_ref: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode?: string
          target_ref?: Json | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          target_ref?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_readings: {
        Row: {
          belief_id: string | null
          created_at: string
          date: string
          id: string
          passage: string
          prompt: string
          reason: string
          reference: string
          user_id: string
        }
        Insert: {
          belief_id?: string | null
          created_at?: string
          date: string
          id?: string
          passage: string
          prompt: string
          reason: string
          reference: string
          user_id: string
        }
        Update: {
          belief_id?: string | null
          created_at?: string
          date?: string
          id?: string
          passage?: string
          prompt?: string
          reason?: string
          reference?: string
          user_id?: string
        }
        Relationships: []
      }
      embedding_jobs: {
        Row: {
          attempts: number
          created_at: string
          error: string | null
          id: string
          processed_at: string | null
          row_id: string
          status: string
          table_name: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error?: string | null
          id?: string
          processed_at?: string | null
          row_id: string
          status?: string
          table_name: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error?: string | null
          id?: string
          processed_at?: string | null
          row_id?: string
          status?: string
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      entity_mentions: {
        Row: {
          artifact_id: string | null
          belief_id: string | null
          confidence: number | null
          created_at: string
          entity_id: string
          id: string
          journal_entry_id: string | null
          snippet: string | null
          user_id: string
        }
        Insert: {
          artifact_id?: string | null
          belief_id?: string | null
          confidence?: number | null
          created_at?: string
          entity_id: string
          id?: string
          journal_entry_id?: string | null
          snippet?: string | null
          user_id: string
        }
        Update: {
          artifact_id?: string | null
          belief_id?: string | null
          confidence?: number | null
          created_at?: string
          entity_id?: string
          id?: string
          journal_entry_id?: string | null
          snippet?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_mentions_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_mentions_belief_id_fkey"
            columns: ["belief_id"]
            isOneToOne: false
            referencedRelation: "belief_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_mentions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "knowledge_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_mentions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      framework_digests: {
        Row: {
          created_at: string
          id: string
          range_end: string
          range_start: string
          sections: Json
          stats: Json
          summary: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          range_end: string
          range_start: string
          sections?: Json
          stats?: Json
          summary: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          range_end?: string
          range_start?: string
          sections?: Json
          stats?: Json
          summary?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      highlights: {
        Row: {
          book: string
          chapter: number
          color: string
          created_at: string
          id: string
          kind: string
          label: string | null
          updated_at: string
          user_id: string
          verse: number
        }
        Insert: {
          book: string
          chapter: number
          color: string
          created_at?: string
          id?: string
          kind?: string
          label?: string | null
          updated_at?: string
          user_id: string
          verse: number
        }
        Update: {
          book?: string
          chapter?: number
          color?: string
          created_at?: string
          id?: string
          kind?: string
          label?: string | null
          updated_at?: string
          user_id?: string
          verse?: number
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          analyze_for_mirror: boolean
          belief_id: string | null
          body: string
          created_at: string
          embedding: string | null
          entry_at: string
          entry_at_ts: string
          entry_kind: string | null
          id: string
          journal_id: string | null
          lat: number | null
          lng: number | null
          location_name: string | null
          mood: number | null
          pinned: boolean
          prompt_id: string | null
          summary: string | null
          tags: string[]
          title: string | null
          updated_at: string
          user_id: string
          verse_ref: string | null
          weather: string | null
          weather_icon: string | null
          weather_temp_c: number | null
        }
        Insert: {
          analyze_for_mirror?: boolean
          belief_id?: string | null
          body?: string
          created_at?: string
          embedding?: string | null
          entry_at?: string
          entry_at_ts?: string
          entry_kind?: string | null
          id?: string
          journal_id?: string | null
          lat?: number | null
          lng?: number | null
          location_name?: string | null
          mood?: number | null
          pinned?: boolean
          prompt_id?: string | null
          summary?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id: string
          verse_ref?: string | null
          weather?: string | null
          weather_icon?: string | null
          weather_temp_c?: number | null
        }
        Update: {
          analyze_for_mirror?: boolean
          belief_id?: string | null
          body?: string
          created_at?: string
          embedding?: string | null
          entry_at?: string
          entry_at_ts?: string
          entry_kind?: string | null
          id?: string
          journal_id?: string | null
          lat?: number | null
          lng?: number | null
          location_name?: string | null
          mood?: number | null
          pinned?: boolean
          prompt_id?: string | null
          summary?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id?: string
          verse_ref?: string | null
          weather?: string | null
          weather_icon?: string | null
          weather_temp_c?: number | null
        }
        Relationships: []
      }
      journal_entry_links: {
        Row: {
          created_at: string
          entry_id: string
          id: string
          target_kind: string
          target_ref: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          id?: string
          target_kind: string
          target_ref?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          id?: string
          target_kind?: string
          target_ref?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_links_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_scores: {
        Row: {
          assumptions: string[]
          axes: Json
          created_at: string
          entry_id: string
          id: string
          themes: string[]
          user_id: string
        }
        Insert: {
          assumptions?: string[]
          axes?: Json
          created_at?: string
          entry_id: string
          id?: string
          themes?: string[]
          user_id: string
        }
        Update: {
          assumptions?: string[]
          axes?: Json
          created_at?: string
          entry_id?: string
          id?: string
          themes?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_scores_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_mirror_reports: {
        Row: {
          aggregate: Json
          conflicts: Json
          created_at: string
          id: string
          kind: string
          range_end: string
          range_start: string
          user_id: string
        }
        Insert: {
          aggregate?: Json
          conflicts?: Json
          created_at?: string
          id?: string
          kind?: string
          range_end: string
          range_start: string
          user_id: string
        }
        Update: {
          aggregate?: Json
          conflicts?: Json
          created_at?: string
          id?: string
          kind?: string
          range_end?: string
          range_start?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_photos: {
        Row: {
          created_at: string
          entry_id: string
          height: number | null
          id: string
          storage_path: string
          user_id: string
          width: number | null
        }
        Insert: {
          created_at?: string
          entry_id: string
          height?: number | null
          id?: string
          storage_path: string
          user_id: string
          width?: number | null
        }
        Update: {
          created_at?: string
          entry_id?: string
          height?: number | null
          id?: string
          storage_path?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_photos_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_prompts: {
        Row: {
          category: string
          created_at: string
          id: string
          locale: string
          text: string
          user_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          locale?: string
          text: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          locale?: string
          text?: string
          user_id?: string | null
        }
        Relationships: []
      }
      journals: {
        Row: {
          color: string
          cover_kind: string
          cover_value: string | null
          created_at: string
          icon: string
          id: string
          is_default: boolean
          name: string
          sort_order: number
          source_kind: string
          source_ref: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          cover_kind?: string
          cover_value?: string | null
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          name: string
          sort_order?: number
          source_kind?: string
          source_ref?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          cover_kind?: string
          cover_value?: string | null
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          name?: string
          sort_order?: number
          source_kind?: string
          source_ref?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_entities: {
        Row: {
          confidence: number | null
          created_at: string
          embedding: string | null
          first_seen_at: string
          id: string
          kind: string
          last_seen_at: string
          metadata: Json
          subtitle: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          embedding?: string | null
          first_seen_at?: string
          id?: string
          kind: string
          last_seen_at?: string
          metadata?: Json
          subtitle?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          embedding?: string | null
          first_seen_at?: string
          id?: string
          kind?: string
          last_seen_at?: string
          metadata?: Json
          subtitle?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      life_priorities: {
        Row: {
          archived_at: string | null
          color: string | null
          created_at: string
          daily_target_minutes: number
          id: string
          intention: string | null
          key: string
          label: string
          rank: number
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          daily_target_minutes?: number
          id?: string
          intention?: string | null
          key: string
          label: string
          rank?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          daily_target_minutes?: number
          id?: string
          intention?: string | null
          key?: string
          label?: string
          rank?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      life_priority_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          minutes: number
          note: string | null
          priority_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_date: string
          minutes?: number
          note?: string | null
          priority_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          minutes?: number
          note?: string | null
          priority_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "life_priority_logs_priority_id_fkey"
            columns: ["priority_id"]
            isOneToOne: false
            referencedRelation: "life_priorities"
            referencedColumns: ["id"]
          },
        ]
      }
      my_ai_chats: {
        Row: {
          created_at: string
          id: string
          journal_entry_id: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          journal_entry_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          journal_entry_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      my_ai_message_candidates: {
        Row: {
          candidate_index: number
          chat_id: string
          citations: Json
          content: string
          created_at: string
          id: string
          judge_rationale: string | null
          scores: Json
          temperature: number
          total_score: number | null
          user_id: string
          was_winner: boolean
          winning_message_id: string | null
        }
        Insert: {
          candidate_index: number
          chat_id: string
          citations?: Json
          content: string
          created_at?: string
          id?: string
          judge_rationale?: string | null
          scores?: Json
          temperature: number
          total_score?: number | null
          user_id: string
          was_winner?: boolean
          winning_message_id?: string | null
        }
        Update: {
          candidate_index?: number
          chat_id?: string
          citations?: Json
          content?: string
          created_at?: string
          id?: string
          judge_rationale?: string | null
          scores?: Json
          temperature?: number
          total_score?: number | null
          user_id?: string
          was_winner?: boolean
          winning_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "my_ai_message_candidates_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "my_ai_chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "my_ai_message_candidates_winning_message_id_fkey"
            columns: ["winning_message_id"]
            isOneToOne: false
            referencedRelation: "my_ai_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      my_ai_messages: {
        Row: {
          chat_id: string
          citations: Json
          content: string
          created_at: string
          embedding: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          chat_id: string
          citations?: Json
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          chat_id?: string
          citations?: Json
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "my_ai_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "my_ai_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          body: string
          book: string
          chapter: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
          verse: number
        }
        Insert: {
          body: string
          book: string
          chapter: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          verse: number
        }
        Update: {
          body?: string
          book?: string
          chapter?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          verse?: number
        }
        Relationships: []
      }
      partner_connections: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          relationship: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          relationship?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          relationship?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      partner_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          expires_at: string
          id: string
          invitee_email: string
          inviter_user_id: string
          relationship: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invitee_email: string
          inviter_user_id: string
          relationship?: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invitee_email?: string
          inviter_user_id?: string
          relationship?: string
          status?: string
          token?: string
        }
        Relationships: []
      }
      partner_share_settings: {
        Row: {
          connection_id: string
          created_at: string
          id: string
          owner_user_id: string
          share_mood_pulse: boolean
          share_prayer_needs: boolean
          share_recent_themes: boolean
          share_summary: boolean
          share_testimony: boolean
          updated_at: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          id?: string
          owner_user_id: string
          share_mood_pulse?: boolean
          share_prayer_needs?: boolean
          share_recent_themes?: boolean
          share_summary?: boolean
          share_testimony?: boolean
          updated_at?: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          id?: string
          owner_user_id?: string
          share_mood_pulse?: boolean
          share_prayer_needs?: boolean
          share_recent_themes?: boolean
          share_summary?: boolean
          share_testimony?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_share_settings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "partner_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_summaries: {
        Row: {
          connection_id: string
          entry_count: number
          generated_at: string
          id: string
          model: string | null
          mood_pulse: Json | null
          owner_user_id: string
          prayer_points: string[]
          recent_themes: string[]
          season_label: string | null
          summary: string
        }
        Insert: {
          connection_id: string
          entry_count?: number
          generated_at?: string
          id?: string
          model?: string | null
          mood_pulse?: Json | null
          owner_user_id: string
          prayer_points?: string[]
          recent_themes?: string[]
          season_label?: string | null
          summary?: string
        }
        Update: {
          connection_id?: string
          entry_count?: number
          generated_at?: string
          id?: string
          model?: string | null
          mood_pulse?: Json | null
          owner_user_id?: string
          prayer_points?: string[]
          recent_themes?: string[]
          season_label?: string | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_summaries_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "partner_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_items: {
        Row: {
          created_at: string
          id: string
          related_belief_ids: string[]
          scriptures: string[]
          status: string
          steps: Json
          teaching_id: string
          title: string
          updated_at: string
          user_id: string
          watch_outs: string[]
          why: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          related_belief_ids?: string[]
          scriptures?: string[]
          status?: string
          steps?: Json
          teaching_id: string
          title: string
          updated_at?: string
          user_id: string
          watch_outs?: string[]
          why?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          related_belief_ids?: string[]
          scriptures?: string[]
          status?: string
          steps?: Json
          teaching_id?: string
          title?: string
          updated_at?: string
          user_id?: string
          watch_outs?: string[]
          why?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playbook_items_teaching_id_fkey"
            columns: ["teaching_id"]
            isOneToOne: false
            referencedRelation: "teachings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          all_entries_cover_focal_x: number
          all_entries_cover_focal_y: number
          all_entries_cover_kind: string
          all_entries_cover_value: string | null
          cover: string
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          font_choice: string
          highlight_palette: string
          id: string
          identity_generated_at: string | null
          identity_summary: Json | null
          layout: string
          onboarded: boolean
          page_tone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_entries_cover_focal_x?: number
          all_entries_cover_focal_y?: number
          all_entries_cover_kind?: string
          all_entries_cover_value?: string | null
          cover?: string
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          font_choice?: string
          highlight_palette?: string
          id?: string
          identity_generated_at?: string | null
          identity_summary?: Json | null
          layout?: string
          onboarded?: boolean
          page_tone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          all_entries_cover_focal_x?: number
          all_entries_cover_focal_y?: number
          all_entries_cover_kind?: string
          all_entries_cover_value?: string | null
          cover?: string
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          font_choice?: string
          highlight_palette?: string
          id?: string
          identity_generated_at?: string | null
          identity_summary?: Json | null
          layout?: string
          onboarded?: boolean
          page_tone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_plans: {
        Row: {
          created_at: string
          id: string
          related_belief_ids: string[]
          schedule: Json
          sections: Json
          summary: string
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          related_belief_ids?: string[]
          schedule?: Json
          sections?: Json
          summary: string
          topic: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          related_belief_ids?: string[]
          schedule?: Json
          sections?: Json
          summary?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      teachings: {
        Row: {
          artifact_id: string | null
          category: string
          confidence: number | null
          created_at: string
          decided_at: string | null
          id: string
          notes: string | null
          scriptures: string[]
          source_snippet: string | null
          status: string
          summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          artifact_id?: string | null
          category: string
          confidence?: number | null
          created_at?: string
          decided_at?: string | null
          id?: string
          notes?: string | null
          scriptures?: string[]
          source_snippet?: string | null
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          artifact_id?: string | null
          category?: string
          confidence?: number | null
          created_at?: string
          decided_at?: string | null
          id?: string
          notes?: string | null
          scriptures?: string[]
          source_snippet?: string | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachings_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      tradition_views: {
        Row: {
          belief_id: string
          created_at: string
          id: string
          traditions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          belief_id: string
          created_at?: string
          id?: string
          traditions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          belief_id?: string
          created_at?: string
          id?: string
          traditions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_cognitive_state: {
        Row: {
          core_frameworks: Json
          created_at: string
          current_season: string
          evolution_summary: string
          inputs_signature: string | null
          last_swept_at: string | null
          model: string | null
          recurring_themes: Json
          unresolved_tensions: Json
          updated_at: string
          user_id: string
          voice_signature: string
          worldview_summary: string
        }
        Insert: {
          core_frameworks?: Json
          created_at?: string
          current_season?: string
          evolution_summary?: string
          inputs_signature?: string | null
          last_swept_at?: string | null
          model?: string | null
          recurring_themes?: Json
          unresolved_tensions?: Json
          updated_at?: string
          user_id: string
          voice_signature?: string
          worldview_summary?: string
        }
        Update: {
          core_frameworks?: Json
          created_at?: string
          current_season?: string
          evolution_summary?: string
          inputs_signature?: string | null
          last_swept_at?: string | null
          model?: string | null
          recurring_themes?: Json
          unresolved_tensions?: Json
          updated_at?: string
          user_id?: string
          voice_signature?: string
          worldview_summary?: string
        }
        Relationships: []
      }
      user_cognitive_state_versions: {
        Row: {
          created_at: string
          id: string
          snapshot: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          snapshot: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          snapshot?: Json
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_partner_invite: { Args: { p_token: string }; Returns: string }
      enqueue_embedding_job: {
        Args: { p_row_id: string; p_table: string; p_user_id: string }
        Returns: undefined
      }
      ensure_default_life_priorities: { Args: never; Returns: undefined }
      match_artifact_claims: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          artifact_id: string
          claim: string
          created_at: string
          id: string
          similarity: number
          verdict: string
        }[]
      }
      match_assistant_messages: {
        Args: {
          exclude_chat_id?: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          chat_id: string
          content: string
          created_at: string
          id: string
          similarity: number
        }[]
      }
      match_beliefs: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          confidence: number
          id: string
          is_core: boolean
          layer: string
          similarity: number
          statement: string
          topic: string
          updated_at: string
        }[]
      }
      match_entities: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          id: string
          kind: string
          last_seen_at: string
          similarity: number
          subtitle: string
          title: string
        }[]
      }
      match_journals: {
        Args: {
          exclude_id?: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          body: string
          entry_at_ts: string
          id: string
          similarity: number
          summary: string
          title: string
        }[]
      }
      merge_knowledge_entity: {
        Args: {
          p_confidence: number
          p_kind: string
          p_metadata: Json
          p_subtitle: string
          p_title: string
          p_user_id: string
        }
        Returns: string
      }
      partner_peer_displays: {
        Args: never
        Returns: {
          connection_id: string
          peer_display_name: string
          peer_email: string
          peer_user_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
