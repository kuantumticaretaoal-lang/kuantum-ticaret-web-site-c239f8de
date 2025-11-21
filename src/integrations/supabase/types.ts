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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      about_us: {
        Row: {
          content: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_visibility_settings: {
        Row: {
          id: string
          setting_key: string
          updated_at: string | null
          visible: boolean | null
        }
        Insert: {
          id?: string
          setting_key: string
          updated_at?: string | null
          visible?: boolean | null
        }
        Update: {
          id?: string
          setting_key?: string
          updated_at?: string | null
          visible?: boolean | null
        }
        Relationships: []
      }
      backup_codes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          used: boolean | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          used?: boolean | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          used?: boolean | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cart: {
        Row: {
          created_at: string
          custom_name: string | null
          custom_photo_url: string | null
          id: string
          product_id: string
          quantity: number
          selected_size: string | null
          session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          custom_name?: string | null
          custom_photo_url?: string | null
          id?: string
          product_id: string
          quantity?: number
          selected_size?: string | null
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          custom_name?: string | null
          custom_photo_url?: string | null
          id?: string
          product_id?: string
          quantity?: number
          selected_size?: string | null
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          replied: boolean | null
          replied_at: string | null
          reply_message: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          replied?: boolean | null
          replied_at?: string | null
          reply_message?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          replied?: boolean | null
          replied_at?: string | null
          reply_message?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          order_id: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          order_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          order_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          custom_name: string | null
          custom_photo_url: string | null
          id: string
          order_id: string
          price: number
          product_id: string
          quantity: number
          selected_size: string | null
        }
        Insert: {
          created_at?: string | null
          custom_name?: string | null
          custom_photo_url?: string | null
          id?: string
          order_id: string
          price: number
          product_id: string
          quantity: number
          selected_size?: string | null
        }
        Update: {
          created_at?: string | null
          custom_name?: string | null
          custom_photo_url?: string | null
          id?: string
          order_id?: string
          price?: number
          product_id?: string
          quantity?: number
          selected_size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          delivery_address: string | null
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          id: string
          order_code: string
          preparation_time: number | null
          preparation_unit: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["order_status"]
          trashed: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delivery_address?: string | null
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          id?: string
          order_code?: string
          preparation_time?: number | null
          preparation_unit?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          trashed?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          delivery_address?: string | null
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          id?: string
          order_code?: string
          preparation_time?: number | null
          preparation_unit?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          trashed?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          product_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          product_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          created_at: string | null
          id: string
          product_id: string
          question: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          created_at?: string | null
          id?: string
          product_id: string
          question: string
          user_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          created_at?: string | null
          id?: string
          product_id?: string
          question?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_questions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          product_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          product_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          product_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allows_custom_photo: boolean | null
          available_sizes: string[] | null
          created_at: string | null
          description: string | null
          id: string
          is_name_customizable: boolean | null
          price: number
          promotion_badges: string[] | null
          stock_quantity: number | null
          stock_status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          allows_custom_photo?: boolean | null
          available_sizes?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_name_customizable?: boolean | null
          price: number
          promotion_badges?: string[] | null
          stock_quantity?: number | null
          stock_status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          allows_custom_photo?: boolean | null
          available_sizes?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_name_customizable?: boolean | null
          price?: number
          promotion_badges?: string[] | null
          stock_quantity?: number | null
          stock_status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string
          created_at: string | null
          district: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          phone: string
          province: string
          updated_at: string | null
        }
        Insert: {
          address: string
          created_at?: string | null
          district: string
          email?: string | null
          first_name: string
          id: string
          last_name: string
          phone: string
          province: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          created_at?: string | null
          district?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
          province?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          address: string | null
          email: string | null
          id: string
          location_url: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          email?: string | null
          id?: string
          location_url?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          email?: string | null
          id?: string
          location_url?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      social_media: {
        Row: {
          google_business: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          updated_at: string | null
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          google_business?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          updated_at?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          google_business?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          updated_at?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          link: string | null
          logo_url: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          link?: string | null
          logo_url?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          link?: string | null
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          is_main_admin: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_main_admin?: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_main_admin?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visitor_analytics: {
        Row: {
          duration: number | null
          id: string
          left_at: string | null
          page_path: string
          user_id: string | null
          visited_at: string | null
        }
        Insert: {
          duration?: number | null
          id?: string
          left_at?: string | null
          page_path: string
          user_id?: string | null
          visited_at?: string | null
        }
        Update: {
          duration?: number | null
          id?: string
          left_at?: string | null
          page_path?: string
          user_id?: string | null
          visited_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_order_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      delivery_type: "home_delivery" | "pickup"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "in_delivery"
        | "delivered"
        | "rejected"
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
      app_role: ["admin", "user"],
      delivery_type: ["home_delivery", "pickup"],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "in_delivery",
        "delivered",
        "rejected",
      ],
    },
  },
} as const
