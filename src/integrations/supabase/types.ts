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
      advisors: {
        Row: {
          active: boolean
          fs_number: string
          id: string
          name: string
          onboarded_at: string
          title: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          fs_number?: string
          id: string
          name: string
          onboarded_at?: string
          title?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          fs_number?: string
          id?: string
          name?: string
          onboarded_at?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      api_call_log: {
        Row: {
          detail: string
          endpoint: string
          id: string
          integration_id: string
          latency_ms: number
          outcome: string
          ts: string
        }
        Insert: {
          detail?: string
          endpoint?: string
          id?: string
          integration_id: string
          latency_ms?: number
          outcome: string
          ts?: string
        }
        Update: {
          detail?: string
          endpoint?: string
          id?: string
          integration_id?: string
          latency_ms?: number
          outcome?: string
          ts?: string
        }
        Relationships: []
      }
      api_credentials: {
        Row: {
          integration_id: string
          rotated_at: string
          rotated_by: string | null
          secret_value: string
        }
        Insert: {
          integration_id: string
          rotated_at?: string
          rotated_by?: string | null
          secret_value: string
        }
        Update: {
          integration_id?: string
          rotated_at?: string
          rotated_by?: string | null
          secret_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_credentials_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: true
            referencedRelation: "api_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_integrations: {
        Row: {
          base_url: string
          category: string
          description: string
          environment: string
          id: string
          key_hint: string | null
          last_checked_at: string | null
          last_rotated_at: string | null
          name: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          base_url?: string
          category: string
          description?: string
          environment?: string
          id: string
          key_hint?: string | null
          last_checked_at?: string | null
          last_rotated_at?: string | null
          name: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          base_url?: string
          category?: string
          description?: string
          environment?: string
          id?: string
          key_hint?: string | null
          last_checked_at?: string | null
          last_rotated_at?: string | null
          name?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      cases: {
        Row: {
          advisor_id: string
          client_name: string
          code: string
          created_at: string
          data: Json
          email: string
          id: string
          phone: string
          updated_at: string
        }
        Insert: {
          advisor_id: string
          client_name: string
          code: string
          created_at?: string
          data: Json
          email?: string
          id: string
          phone?: string
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          client_name?: string
          code?: string
          created_at?: string
          data?: Json
          email?: string
          id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_connections: {
        Row: {
          connected: boolean
          detail: string
          id: string
          last_sync_at: string | null
          name: string
        }
        Insert: {
          connected?: boolean
          detail?: string
          id: string
          last_sync_at?: string | null
          name: string
        }
        Update: {
          connected?: boolean
          detail?: string
          id?: string
          last_sync_at?: string | null
          name?: string
        }
        Relationships: []
      }
      crm_log: {
        Row: {
          action: string
          case_id: string
          client_name: string
          crm: string
          id: string
          object: string
          ts: string
        }
        Insert: {
          action: string
          case_id: string
          client_name: string
          crm: string
          id: string
          object: string
          ts: string
        }
        Update: {
          action?: string
          case_id?: string
          client_name?: string
          crm?: string
          id?: string
          object?: string
          ts?: string
        }
        Relationships: []
      }
      fsp_settings: {
        Row: {
          fsp_number: string
          id: boolean
          key_individual: string
          name: string
          updated_at: string
        }
        Insert: {
          fsp_number?: string
          id?: boolean
          key_individual?: string
          name?: string
          updated_at?: string
        }
        Update: {
          fsp_number?: string
          id?: boolean
          key_individual?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      integration_queue: {
        Row: {
          action: string
          attempts: number
          case_id: string
          client_name: string
          id: string
          last_error: string | null
          status: string
          target: string
          ts: string
        }
        Insert: {
          action: string
          attempts?: number
          case_id?: string
          client_name?: string
          id: string
          last_error?: string | null
          status: string
          target: string
          ts: string
        }
        Update: {
          action?: string
          attempts?: number
          case_id?: string
          client_name?: string
          id?: string
          last_error?: string | null
          status?: string
          target?: string
          ts?: string
        }
        Relationships: []
      }
      ledger_events: {
        Row: {
          actor_name: string
          actor_role: string
          case_id: string | null
          hash: string
          prev_hash: string
          seq: number
          summary: string
          ts: string
          type: string
        }
        Insert: {
          actor_name: string
          actor_role: string
          case_id?: string | null
          hash: string
          prev_hash: string
          seq: number
          summary: string
          ts: string
          type: string
        }
        Update: {
          actor_name?: string
          actor_role?: string
          case_id?: string | null
          hash?: string
          prev_hash?: string
          seq?: number
          summary?: string
          ts?: string
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          title: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id: string
          title?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "advisor" | "compliance" | "client"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "advisor", "compliance", "client"],
    },
  },
} as const
