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
      abandoned_cart_reminders: {
        Row: {
          cart_snapshot: Json | null
          created_at: string | null
          email_sent: boolean | null
          id: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          cart_snapshot?: Json | null
          created_at?: string | null
          email_sent?: boolean | null
          id?: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          cart_snapshot?: Json | null
          created_at?: string | null
          email_sent?: boolean | null
          id?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
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
      banner_dismissals: {
        Row: {
          banner_id: string | null
          device_id: string | null
          dismissed_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          banner_id?: string | null
          device_id?: string | null
          dismissed_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          banner_id?: string | null
          device_id?: string | null
          dismissed_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banner_dismissals_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "campaign_banners"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_banners: {
        Row: {
          background_color: string | null
          background_image_url: string | null
          countdown_end: string | null
          created_at: string | null
          description: string | null
          hide_days_after_close: number | null
          id: string
          is_active: boolean | null
          priority: number | null
          scrolling_text: string | null
          show_countdown: boolean | null
          show_on_all_pages: boolean | null
          show_on_homepage: boolean | null
          show_on_products: boolean | null
          target_all_users: boolean | null
          target_cart_users: boolean | null
          target_new_users: boolean | null
          target_premium_users: boolean | null
          text_color: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          background_color?: string | null
          background_image_url?: string | null
          countdown_end?: string | null
          created_at?: string | null
          description?: string | null
          hide_days_after_close?: number | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          scrolling_text?: string | null
          show_countdown?: boolean | null
          show_on_all_pages?: boolean | null
          show_on_homepage?: boolean | null
          show_on_products?: boolean | null
          target_all_users?: boolean | null
          target_cart_users?: boolean | null
          target_new_users?: boolean | null
          target_premium_users?: boolean | null
          text_color?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          background_color?: string | null
          background_image_url?: string | null
          countdown_end?: string | null
          created_at?: string | null
          description?: string | null
          hide_days_after_close?: number | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          scrolling_text?: string | null
          show_countdown?: boolean | null
          show_on_all_pages?: boolean | null
          show_on_homepage?: boolean | null
          show_on_products?: boolean | null
          target_all_users?: boolean | null
          target_cart_users?: boolean | null
          target_new_users?: boolean | null
          target_premium_users?: boolean | null
          text_color?: string | null
          title?: string
          updated_at?: string | null
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
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
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
      cookie_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      cookie_consents: {
        Row: {
          accepted: boolean | null
          category_id: string | null
          consented_at: string | null
          device_id: string
          id: string
          user_id: string | null
        }
        Insert: {
          accepted?: boolean | null
          category_id?: string | null
          consented_at?: string | null
          device_id: string
          id?: string
          user_id?: string | null
        }
        Update: {
          accepted?: boolean | null
          category_id?: string | null
          consented_at?: string | null
          device_id?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cookie_consents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "cookie_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usages: {
        Row: {
          coupon_id: string
          id: string
          order_id: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          coupon_id: string
          id?: string
          order_id?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string
          id?: string
          order_id?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usages_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_order_amount: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          from_currency: string
          id: string
          rate: number
          to_currency: string
          updated_at: string | null
        }
        Insert: {
          from_currency?: string
          id?: string
          rate: number
          to_currency: string
          updated_at?: string | null
        }
        Update: {
          from_currency?: string
          id?: string
          rate?: number
          to_currency?: string
          updated_at?: string | null
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
      favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      premium_benefits: {
        Row: {
          benefit_text: string
          created_at: string | null
          id: string
          plan_id: string | null
          sort_order: number | null
        }
        Insert: {
          benefit_text: string
          created_at?: string | null
          id?: string
          plan_id?: string | null
          sort_order?: number | null
        }
        Update: {
          benefit_text?: string
          created_at?: string | null
          id?: string
          plan_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "premium_benefits_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "premium_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_memberships: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_trial: boolean | null
          plan_id: string | null
          starts_at: string | null
          status: string
          trial_days: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_trial?: boolean | null
          plan_id?: string | null
          starts_at?: string | null
          status?: string
          trial_days?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_trial?: boolean | null
          plan_id?: string | null
          starts_at?: string | null
          status?: string
          trial_days?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "premium_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_plans: {
        Row: {
          created_at: string | null
          description: string | null
          discount_percent: number | null
          duration_days: number
          early_access: boolean | null
          free_shipping: boolean | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          duration_days?: number
          early_access?: boolean | null
          free_shipping?: boolean | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          duration_days?: number
          early_access?: boolean | null
          free_shipping?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      premium_requests: {
        Row: {
          created_at: string | null
          id: string
          plan_id: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          plan_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          plan_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_requests_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "premium_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      product_analytics: {
        Row: {
          cart_add_count: number | null
          created_at: string | null
          id: string
          last_viewed_at: string | null
          product_id: string | null
          view_count: number | null
        }
        Insert: {
          cart_add_count?: number | null
          created_at?: string | null
          id?: string
          last_viewed_at?: string | null
          product_id?: string | null
          view_count?: number | null
        }
        Update: {
          cart_add_count?: number | null
          created_at?: string | null
          id?: string
          last_viewed_at?: string | null
          product_id?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_analytics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      product_purchase_pairs: {
        Row: {
          id: string
          paired_product_id: string | null
          product_id: string | null
          purchase_count: number | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          paired_product_id?: string | null
          product_id?: string | null
          purchase_count?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          paired_product_id?: string | null
          product_id?: string | null
          purchase_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_purchase_pairs_paired_product_id_fkey"
            columns: ["paired_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_purchase_pairs_product_id_fkey"
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
          category_id: string | null
          created_at: string | null
          description: string | null
          discounted_price: number | null
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
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          discounted_price?: number | null
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
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          discounted_price?: number | null
          id?: string
          is_name_customizable?: boolean | null
          price?: number
          promotion_badges?: string[] | null
          stock_quantity?: number | null
          stock_status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
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
      search_history: {
        Row: {
          created_at: string | null
          id: string
          results_count: number | null
          search_query: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          results_count?: number | null
          search_query: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          results_count?: number | null
          search_query?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shipping_settings: {
        Row: {
          base_fee: number
          delivery_type: string
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          base_fee?: number
          delivery_type: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          base_fee?: number
          delivery_type?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      site_policies: {
        Row: {
          content: string | null
          id: string
          is_active: boolean | null
          policy_type: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          id?: string
          is_active?: boolean | null
          policy_type: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          id?: string
          is_active?: boolean | null
          policy_type?: string
          title?: string
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
      supported_languages: {
        Row: {
          code: string
          created_at: string | null
          currency_code: string
          currency_symbol: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          native_name: string
          sort_order: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          currency_code: string
          currency_symbol: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          native_name: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          currency_code?: string
          currency_symbol?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          native_name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      urgency_settings: {
        Row: {
          display_text: string | null
          id: string
          is_enabled: boolean | null
          setting_key: string
          threshold: number | null
          updated_at: string | null
        }
        Insert: {
          display_text?: string | null
          id?: string
          is_enabled?: boolean | null
          setting_key: string
          threshold?: number | null
          updated_at?: string | null
        }
        Update: {
          display_text?: string | null
          id?: string
          is_enabled?: boolean | null
          setting_key?: string
          threshold?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          custom_role: string | null
          id: string
          is_main_admin: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          custom_role?: string | null
          id?: string
          is_main_admin?: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          custom_role?: string | null
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
      generate_hashed_backup_code: {
        Args: { user_id_param: string }
        Returns: string
      }
      generate_order_code: { Args: never; Returns: string }
      get_daily_submission_count: {
        Args: { p_table_name: string; p_user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_backup_code: { Args: { plain_code: string }; Returns: string }
      increment_coupon_usage: {
        Args: { p_coupon_id: string }
        Returns: undefined
      }
      increment_product_view: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      is_premium_user: { Args: { p_user_id: string }; Returns: boolean }
      validate_coupon: {
        Args: { p_code: string; p_order_total: number; p_user_id: string }
        Returns: {
          coupon_id: string
          discount_type: string
          discount_value: number
          error_message: string
          is_valid: boolean
        }[]
      }
      verify_backup_code: {
        Args: { plain_code: string; user_id_param: string }
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
