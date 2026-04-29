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
      agent_applications: {
        Row: {
          admin_notes: string | null
          business_name: string
          business_type: string
          contact_phone: string
          country: string
          created_at: string
          document_paths: string[]
          id: string
          registration_number: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          admin_notes?: string | null
          business_name: string
          business_type: string
          contact_phone: string
          country: string
          created_at?: string
          document_paths?: string[]
          id?: string
          registration_number: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          admin_notes?: string | null
          business_name?: string
          business_type?: string
          contact_phone?: string
          country?: string
          created_at?: string
          document_paths?: string[]
          id?: string
          registration_number?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      bookings_unified: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          error: string | null
          external_reference: string | null
          id: string
          inventory_item_id: string | null
          payload: Json
          provider_id: string | null
          status: Database["public"]["Enums"]["unified_booking_status"]
          updated_at: string
          user_id: string | null
          vertical: Database["public"]["Enums"]["vertical"]
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          error?: string | null
          external_reference?: string | null
          id?: string
          inventory_item_id?: string | null
          payload?: Json
          provider_id?: string | null
          status?: Database["public"]["Enums"]["unified_booking_status"]
          updated_at?: string
          user_id?: string | null
          vertical: Database["public"]["Enums"]["vertical"]
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          error?: string | null
          external_reference?: string | null
          id?: string
          inventory_item_id?: string | null
          payload?: Json
          provider_id?: string | null
          status?: Database["public"]["Enums"]["unified_booking_status"]
          updated_at?: string
          user_id?: string | null
          vertical?: Database["public"]["Enums"]["vertical"]
        }
        Relationships: [
          {
            foreignKeyName: "bookings_unified_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_unified_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_bookings: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          notes: string | null
          service_id: string
          slot_id: string
          status: Database["public"]["Enums"]["booking_status"]
          tier_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          notes?: string | null
          service_id: string
          slot_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          tier_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          notes?: string | null
          service_id?: string
          slot_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          tier_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "consultation_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: true
            referencedRelation: "consultation_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_bookings_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "consultation_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_services: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      consultation_slots: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          is_booked: boolean
          service_id: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          is_booked?: boolean
          service_id: string
          starts_at: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          is_booked?: boolean
          service_id?: string
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_slots_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "consultation_services"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_tiers: {
        Row: {
          created_at: string
          currency: string
          duration_minutes: number
          id: string
          is_active: boolean
          price_cents: number
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          duration_minutes: number
          id?: string
          is_active?: boolean
          price_cents: number
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean
          price_cents?: number
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_tiers_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "consultation_services"
            referencedColumns: ["id"]
          },
        ]
      }
      crawl_jobs: {
        Row: {
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          items_deactivated: number
          items_seen: number
          items_upserted: number
          provider_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["crawl_status"]
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          items_deactivated?: number
          items_seen?: number
          items_upserted?: number
          provider_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["crawl_status"]
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          items_deactivated?: number
          items_seen?: number
          items_upserted?: number
          provider_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["crawl_status"]
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crawl_jobs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          is_enabled: boolean
          name: string
          rate_to_usd: number
          sort_order: number
          symbol: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          is_enabled?: boolean
          name: string
          rate_to_usd?: number
          sort_order?: number
          symbol: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          is_enabled?: boolean
          name?: string
          rate_to_usd?: number
          sort_order?: number
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          attributes: Json
          created_at: string
          currency: string
          description: string | null
          destination: string | null
          duration: string | null
          external_id: string | null
          id: string
          images: Json
          is_active: boolean
          last_seen_at: string
          origin: string | null
          price: number | null
          provider_id: string
          raw: Json | null
          source_url: string | null
          subtitle: string | null
          title: string
          updated_at: string
          validity: string | null
          vertical: Database["public"]["Enums"]["vertical"]
        }
        Insert: {
          attributes?: Json
          created_at?: string
          currency?: string
          description?: string | null
          destination?: string | null
          duration?: string | null
          external_id?: string | null
          id?: string
          images?: Json
          is_active?: boolean
          last_seen_at?: string
          origin?: string | null
          price?: number | null
          provider_id: string
          raw?: Json | null
          source_url?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
          validity?: string | null
          vertical: Database["public"]["Enums"]["vertical"]
        }
        Update: {
          attributes?: Json
          created_at?: string
          currency?: string
          description?: string | null
          destination?: string | null
          duration?: string | null
          external_id?: string | null
          id?: string
          images?: Json
          is_active?: boolean
          last_seen_at?: string
          origin?: string | null
          price?: number | null
          provider_id?: string
          raw?: Json | null
          source_url?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
          validity?: string | null
          vertical?: Database["public"]["Enums"]["vertical"]
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          agent_status: Database["public"]["Enums"]["agent_status"]
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          agent_status?: Database["public"]["Enums"]["agent_status"]
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          agent_status?: Database["public"]["Enums"]["agent_status"]
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_health_events: {
        Row: {
          created_at: string
          id: number
          latency_ms: number | null
          message: string | null
          ok: boolean
          provider_id: string
          status_code: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          latency_ms?: number | null
          message?: string | null
          ok: boolean
          provider_id: string
          status_code?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          latency_ms?: number | null
          message?: string | null
          ok?: boolean
          provider_id?: string
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_health_events_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          base_url: string | null
          created_at: string
          enabled: boolean
          id: string
          kind: Database["public"]["Enums"]["provider_kind"]
          last_error: string | null
          last_error_at: string | null
          last_ok_at: string | null
          name: string
          notes: string | null
          slug: string
          total_calls: number
          total_errors: number
          updated_at: string
          vertical: Database["public"]["Enums"]["vertical"]
        }
        Insert: {
          base_url?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          kind: Database["public"]["Enums"]["provider_kind"]
          last_error?: string | null
          last_error_at?: string | null
          last_ok_at?: string | null
          name: string
          notes?: string | null
          slug: string
          total_calls?: number
          total_errors?: number
          updated_at?: string
          vertical: Database["public"]["Enums"]["vertical"]
        }
        Update: {
          base_url?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          kind?: Database["public"]["Enums"]["provider_kind"]
          last_error?: string | null
          last_error_at?: string | null
          last_ok_at?: string | null
          name?: string
          notes?: string | null
          slug?: string
          total_calls?: number
          total_errors?: number
          updated_at?: string
          vertical?: Database["public"]["Enums"]["vertical"]
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vertical_markups: {
        Row: {
          b2b_pct: number
          customer_pct: number
          updated_at: string
          updated_by: string | null
          vertical: Database["public"]["Enums"]["vertical"]
        }
        Insert: {
          b2b_pct?: number
          customer_pct?: number
          updated_at?: string
          updated_by?: string | null
          vertical: Database["public"]["Enums"]["vertical"]
        }
        Update: {
          b2b_pct?: number
          customer_pct?: number
          updated_at?: string
          updated_by?: string | null
          vertical?: Database["public"]["Enums"]["vertical"]
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
      account_type: "customer" | "agent"
      agent_status: "none" | "pending" | "approved" | "rejected"
      app_role: "customer" | "agent" | "admin"
      application_status: "pending" | "approved" | "rejected"
      booking_status: "pending" | "confirmed" | "cancelled" | "completed"
      crawl_status: "queued" | "running" | "succeeded" | "failed"
      provider_kind: "api" | "crawl"
      unified_booking_status:
        | "pending"
        | "confirmed"
        | "failed"
        | "cancelled"
        | "refunded"
      vertical:
        | "flights"
        | "stays"
        | "visas"
        | "insurance"
        | "tours"
        | "pickups"
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
    Enums: {
      account_type: ["customer", "agent"],
      agent_status: ["none", "pending", "approved", "rejected"],
      app_role: ["customer", "agent", "admin"],
      application_status: ["pending", "approved", "rejected"],
      booking_status: ["pending", "confirmed", "cancelled", "completed"],
      crawl_status: ["queued", "running", "succeeded", "failed"],
      provider_kind: ["api", "crawl"],
      unified_booking_status: [
        "pending",
        "confirmed",
        "failed",
        "cancelled",
        "refunded",
      ],
      vertical: ["flights", "stays", "visas", "insurance", "tours", "pickups"],
    },
  },
} as const
