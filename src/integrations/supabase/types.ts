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
      artifacts: {
        Row: {
          created_at: string
          error: string | null
          id: string
          kind: string
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
          created_at: string
          id: string
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
          created_at?: string
          id?: string
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
          created_at?: string
          id?: string
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
          belief_id: string
          created_at: string
          id: string
          label: string
          source_type: string
          user_id: string
        }
        Insert: {
          artifact_id?: string | null
          belief_id: string
          created_at?: string
          id?: string
          label: string
          source_type: string
          user_id: string
        }
        Update: {
          artifact_id?: string | null
          belief_id?: string
          created_at?: string
          id?: string
          label?: string
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
      profiles: {
        Row: {
          cover: string
          created_at: string
          display_name: string | null
          font_choice: string
          highlight_palette: string
          id: string
          layout: string
          onboarded: boolean
          page_tone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover?: string
          created_at?: string
          display_name?: string | null
          font_choice?: string
          highlight_palette?: string
          id?: string
          layout?: string
          onboarded?: boolean
          page_tone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover?: string
          created_at?: string
          display_name?: string | null
          font_choice?: string
          highlight_palette?: string
          id?: string
          layout?: string
          onboarded?: boolean
          page_tone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
