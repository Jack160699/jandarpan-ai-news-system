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
      affiliate_placements: {
        Row: {
          created_at: string
          description: string | null
          disclosure_en: string | null
          disclosure_hi: string | null
          enabled: boolean
          id: string
          image_url: string | null
          partner_name: string
          slot_id: string
          sort_order: number
          target_url: string
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          disclosure_en?: string | null
          disclosure_hi?: string | null
          enabled?: boolean
          id?: string
          image_url?: string | null
          partner_name: string
          slot_id: string
          sort_order?: number
          target_url: string
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          disclosure_en?: string | null
          disclosure_hi?: string | null
          enabled?: boolean
          id?: string
          image_url?: string | null
          partner_name?: string
          slot_id?: string
          sort_order?: number
          target_url?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_placements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_report_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          enabled: boolean
          format: string
          frequency: string
          id: string
          last_run_at: string | null
          name: string
          next_run_at: string | null
          tenant_id: string
          updated_at: string
          window_hours: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          enabled?: boolean
          format?: string
          frequency: string
          id?: string
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          tenant_id: string
          updated_at?: string
          window_hours?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          enabled?: boolean
          format?: string
          frequency?: string
          id?: string
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          tenant_id?: string
          updated_at?: string
          window_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "analytics_report_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_snapshots: {
        Row: {
          built_at: string
          id: string
          snapshot: Json
          tenant_id: string
          window_hours: number
        }
        Insert: {
          built_at?: string
          id?: string
          snapshot: Json
          tenant_id: string
          window_hours?: number
        }
        Update: {
          built_at?: string
          id?: string
          snapshot?: Json
          tenant_id?: string
          window_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "analytics_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      api_provider_health: {
        Row: {
          avg_latency_ms: number
          consecutive_failures: number
          disabled_until: string | null
          failure_count: number
          health_score: number
          last_article_count: number
          last_failure: string | null
          last_success: string | null
          provider_id: string
          updated_at: string
        }
        Insert: {
          avg_latency_ms?: number
          consecutive_failures?: number
          disabled_until?: string | null
          failure_count?: number
          health_score?: number
          last_article_count?: number
          last_failure?: string | null
          last_success?: string | null
          provider_id: string
          updated_at?: string
        }
        Update: {
          avg_latency_ms?: number
          consecutive_failures?: number
          disabled_until?: string | null
          failure_count?: number
          health_score?: number
          last_article_count?: number
          last_failure?: string | null
          last_success?: string | null
          provider_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      article_metrics_daily: {
        Row: {
          article_slug: string
          bucket_date: string
          clicks: number
          engagements: number
          scroll_depth_sum: number
          scroll_samples: number
          tenant_id: string
          total_dwell_ms: number
          updated_at: string
          views: number
        }
        Insert: {
          article_slug: string
          bucket_date?: string
          clicks?: number
          engagements?: number
          scroll_depth_sum?: number
          scroll_samples?: number
          tenant_id: string
          total_dwell_ms?: number
          updated_at?: string
          views?: number
        }
        Update: {
          article_slug?: string
          bucket_date?: string
          clicks?: number
          engagements?: number
          scroll_depth_sum?: number
          scroll_samples?: number
          tenant_id?: string
          total_dwell_ms?: number
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "article_metrics_daily_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      breaking_velocity_snapshots: {
        Row: {
          article_slug: string
          captured_at: string
          id: string
          is_breaking: boolean
          tenant_id: string | null
          velocity_score: number
          views_1h: number
          views_24h: number
        }
        Insert: {
          article_slug: string
          captured_at?: string
          id?: string
          is_breaking?: boolean
          tenant_id?: string | null
          velocity_score?: number
          views_1h?: number
          views_24h?: number
        }
        Update: {
          article_slug?: string
          captured_at?: string
          id?: string
          is_breaking?: boolean
          tenant_id?: string | null
          velocity_score?: number
          views_1h?: number
          views_24h?: number
        }
        Relationships: [
          {
            foreignKeyName: "breaking_velocity_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      coverage_updates: {
        Row: {
          cluster_confidence: number | null
          created_at: string
          event_id: string
          headline: string
          id: string
          is_breaking: boolean
          published_at: string
          signal_ids: string[]
          source_attribution: Json
          summary: string | null
          update_type: string
        }
        Insert: {
          cluster_confidence?: number | null
          created_at?: string
          event_id: string
          headline: string
          id?: string
          is_breaking?: boolean
          published_at?: string
          signal_ids?: string[]
          source_attribution?: Json
          summary?: string | null
          update_type?: string
        }
        Update: {
          cluster_confidence?: number | null
          created_at?: string
          event_id?: string
          headline?: string
          id?: string
          is_breaking?: boolean
          published_at?: string
          signal_ids?: string[]
          source_attribution?: Json
          summary?: string | null
          update_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "coverage_updates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "news_events"
            referencedColumns: ["id"]
          },
        ]
      }
      dam_analyze_queue: {
        Row: {
          asset_id: string
          created_at: string
          error: string | null
          id: string
          processed_at: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string
          error?: string | null
          id?: string
          processed_at?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string
          error?: string | null
          id?: string
          processed_at?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dam_analyze_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dam_asset_variants: {
        Row: {
          asset_id: string
          created_at: string
          height: number | null
          id: string
          public_url: string
          size_bytes: number
          storage_path: string
          variant_key: string
          width: number | null
        }
        Insert: {
          asset_id: string
          created_at?: string
          height?: number | null
          id?: string
          public_url: string
          size_bytes?: number
          storage_path: string
          variant_key: string
          width?: number | null
        }
        Update: {
          asset_id?: string
          created_at?: string
          height?: number | null
          id?: string
          public_url?: string
          size_bytes?: number
          storage_path?: string
          variant_key?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dam_asset_variants_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "dam_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      dam_assets: {
        Row: {
          ai_caption: string | null
          ai_faces: Json
          ai_objects: string[]
          ai_ocr: string | null
          ai_tags: string[]
          cdn_optimized: boolean
          content_hash: string
          copyright: Json
          created_at: string
          created_by: string | null
          duplicate_of: string | null
          duration_sec: number | null
          folder_id: string | null
          height: number | null
          id: string
          media_type: string
          metadata: Json
          mime_type: string
          name: string
          public_url: string
          size_bytes: number
          storage_path: string
          tenant_id: string
          updated_at: string
          watermark_applied: boolean
          width: number | null
        }
        Insert: {
          ai_caption?: string | null
          ai_faces?: Json
          ai_objects?: string[]
          ai_ocr?: string | null
          ai_tags?: string[]
          cdn_optimized?: boolean
          content_hash: string
          copyright?: Json
          created_at?: string
          created_by?: string | null
          duplicate_of?: string | null
          duration_sec?: number | null
          folder_id?: string | null
          height?: number | null
          id?: string
          media_type: string
          metadata?: Json
          mime_type: string
          name: string
          public_url: string
          size_bytes?: number
          storage_path: string
          tenant_id: string
          updated_at?: string
          watermark_applied?: boolean
          width?: number | null
        }
        Update: {
          ai_caption?: string | null
          ai_faces?: Json
          ai_objects?: string[]
          ai_ocr?: string | null
          ai_tags?: string[]
          cdn_optimized?: boolean
          content_hash?: string
          copyright?: Json
          created_at?: string
          created_by?: string | null
          duplicate_of?: string | null
          duration_sec?: number | null
          folder_id?: string | null
          height?: number | null
          id?: string
          media_type?: string
          metadata?: Json
          mime_type?: string
          name?: string
          public_url?: string
          size_bytes?: number
          storage_path?: string
          tenant_id?: string
          updated_at?: string
          watermark_applied?: boolean
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dam_assets_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "dam_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dam_assets_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "dam_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dam_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dam_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          slug: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dam_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "dam_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dam_folders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          payload: Json
          resource_id: string | null
          resource_type: string
          tenant_id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          payload?: Json
          resource_id?: string | null
          resource_type?: string
          tenant_id: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          payload?: Json
          resource_id?: string | null
          resource_type?: string
          tenant_id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "editorial_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_image_queue: {
        Row: {
          attempts: number
          approval_status: string
          created_at: string
          custom_prompt: string | null
          error: string | null
          generated_article_id: string
          generation_history: Json
          hero_image_url: string | null
          id: string
          image_source: string | null
          max_attempts: number
          og_image_url: string | null
          priority: number
          processed_at: string | null
          processing_started_at: string | null
          prompt_hash: string | null
          scheduled_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          approval_status?: string
          created_at?: string
          custom_prompt?: string | null
          error?: string | null
          generated_article_id: string
          generation_history?: Json
          hero_image_url?: string | null
          id?: string
          image_source?: string | null
          max_attempts?: number
          og_image_url?: string | null
          priority?: number
          processed_at?: string | null
          processing_started_at?: string | null
          prompt_hash?: string | null
          scheduled_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          approval_status?: string
          created_at?: string
          custom_prompt?: string | null
          error?: string | null
          generated_article_id?: string
          generation_history?: Json
          hero_image_url?: string | null
          id?: string
          image_source?: string | null
          max_attempts?: number
          og_image_url?: string | null
          priority?: number
          processed_at?: string | null
          processing_started_at?: string | null
          prompt_hash?: string | null
          scheduled_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "editorial_image_queue_generated_article_id_fkey"
            columns: ["generated_article_id"]
            isOneToOne: false
            referencedRelation: "generated_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_image_generations: {
        Row: {
          attempt_number: number
          created_at: string
          error: string | null
          generated_article_id: string
          hero_image_url: string | null
          id: string
          latency_ms: number | null
          metadata: Json
          model: string | null
          og_image_url: string | null
          prompt: string
          prompt_hash: string | null
          provider: string
          quality_flags: string[] | null
          quality_score: number | null
          queue_id: string | null
          status: string
          visual_hash: string | null
        }
        Insert: {
          attempt_number?: number
          created_at?: string
          error?: string | null
          generated_article_id: string
          hero_image_url?: string | null
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          og_image_url?: string | null
          prompt: string
          prompt_hash?: string | null
          provider?: string
          quality_flags?: string[] | null
          quality_score?: number | null
          queue_id?: string | null
          status: string
          visual_hash?: string | null
        }
        Update: {
          attempt_number?: number
          created_at?: string
          error?: string | null
          generated_article_id?: string
          hero_image_url?: string | null
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          og_image_url?: string | null
          prompt?: string
          prompt_hash?: string | null
          provider?: string
          quality_flags?: string[] | null
          quality_score?: number | null
          queue_id?: string | null
          status?: string
          visual_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "editorial_image_generations_generated_article_id_fkey"
            columns: ["generated_article_id"]
            isOneToOne: false
            referencedRelation: "generated_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_image_generations_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "editorial_image_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_image_metrics_daily: {
        Row: {
          ai_generated: number
          avg_latency_ms: number | null
          avg_quality_score: number | null
          completed: number
          day: string
          failed: number
          fallback_used: number
          provider_errors: number
          quality_rejections: number
          retried: number
          total_jobs: number
          updated_at: string
        }
        Insert: {
          ai_generated?: number
          avg_latency_ms?: number | null
          avg_quality_score?: number | null
          completed?: number
          day: string
          failed?: number
          fallback_used?: number
          provider_errors?: number
          quality_rejections?: number
          retried?: number
          total_jobs?: number
          updated_at?: string
        }
        Update: {
          ai_generated?: number
          avg_latency_ms?: number | null
          avg_quality_score?: number | null
          completed?: number
          day?: string
          failed?: number
          fallback_used?: number
          provider_errors?: number
          quality_rejections?: number
          retried?: number
          total_jobs?: number
          updated_at?: string
        }
        Relationships: []
      }
      editorial_workflow_comments: {
        Row: {
          article_id: string
          author_email: string
          author_user_id: string | null
          body: string
          created_at: string
          id: string
          tenant_id: string | null
          workflow_status: string | null
        }
        Insert: {
          article_id: string
          author_email: string
          author_user_id?: string | null
          body: string
          created_at?: string
          id?: string
          tenant_id?: string | null
          workflow_status?: string | null
        }
        Update: {
          article_id?: string
          author_email?: string
          author_user_id?: string | null
          body?: string
          created_at?: string
          id?: string
          tenant_id?: string | null
          workflow_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "editorial_workflow_comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "generated_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_workflow_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_workflow_events: {
        Row: {
          actor_email: string | null
          actor_user_id: string | null
          article_id: string
          comment: string | null
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          payload: Json
          rejection_reason: string | null
          tenant_id: string | null
          to_status: string | null
        }
        Insert: {
          actor_email?: string | null
          actor_user_id?: string | null
          article_id: string
          comment?: string | null
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          payload?: Json
          rejection_reason?: string | null
          tenant_id?: string | null
          to_status?: string | null
        }
        Update: {
          actor_email?: string | null
          actor_user_id?: string | null
          article_id?: string
          comment?: string | null
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          payload?: Json
          rejection_reason?: string | null
          tenant_id?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "editorial_workflow_events_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "generated_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_workflow_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_bus_messages: {
        Row: {
          attempts: number
          created_at: string
          dedupe_key: string | null
          delivered_at: string | null
          event_type: string
          id: string
          last_error: string | null
          max_attempts: number
          payload: Json
          scheduled_at: string
          status: string
          tenant_id: string | null
          topic: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          dedupe_key?: string | null
          delivered_at?: string | null
          event_type: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          payload?: Json
          scheduled_at?: string
          status?: string
          tenant_id?: string | null
          topic: string
        }
        Update: {
          attempts?: number
          created_at?: string
          dedupe_key?: string | null
          delivered_at?: string | null
          event_type?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          payload?: Json
          scheduled_at?: string
          status?: string
          tenant_id?: string | null
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_bus_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_articles: {
        Row: {
          article_body: string | null
          created_at: string
          editorial_metadata: Json
          editorial_status: string
          event_id: string | null
          geo_metadata: Json | null
          headline: string
          hero_image_url: string | null
          homepage_pin: boolean
          id: string
          language: string | null
          pinned_at: string | null
          published_at: string | null
          reading_time: string | null
          reviewed_at: string | null
          seo_description: string | null
          seo_title: string | null
          shorts_metadata: Json | null
          slug: string
          summary: string | null
          tags: string[]
          tenant_id: string | null
          translations: Json
          workflow_assigned_to: string | null
          workflow_deadline_at: string | null
          workflow_rejection_reason: string | null
          workflow_status: string
        }
        Insert: {
          article_body?: string | null
          created_at?: string
          editorial_metadata?: Json
          editorial_status?: string
          event_id?: string | null
          geo_metadata?: Json | null
          headline: string
          hero_image_url?: string | null
          homepage_pin?: boolean
          id?: string
          language?: string | null
          pinned_at?: string | null
          published_at?: string | null
          reading_time?: string | null
          reviewed_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          shorts_metadata?: Json | null
          slug: string
          summary?: string | null
          tags?: string[]
          tenant_id?: string | null
          translations?: Json
          workflow_assigned_to?: string | null
          workflow_deadline_at?: string | null
          workflow_rejection_reason?: string | null
          workflow_status?: string
        }
        Update: {
          article_body?: string | null
          created_at?: string
          editorial_metadata?: Json
          editorial_status?: string
          event_id?: string | null
          geo_metadata?: Json | null
          headline?: string
          hero_image_url?: string | null
          homepage_pin?: boolean
          id?: string
          language?: string | null
          pinned_at?: string | null
          published_at?: string | null
          reading_time?: string | null
          reviewed_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          shorts_metadata?: Json | null
          slug?: string
          summary?: string | null
          tags?: string[]
          tenant_id?: string | null
          translations?: Json
          workflow_assigned_to?: string | null
          workflow_deadline_at?: string | null
          workflow_rejection_reason?: string | null
          workflow_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_articles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "news_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_articles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_failures: {
        Row: {
          article_url: string | null
          created_at: string
          id: string
          payload: Json | null
          provider: string | null
          reason: string
          title: string | null
        }
        Insert: {
          article_url?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          provider?: string | null
          reason: string
          title?: string | null
        }
        Update: {
          article_url?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          provider?: string | null
          reason?: string
          title?: string | null
        }
        Relationships: []
      }
      ingestion_logs: {
        Row: {
          category_stats: Json | null
          created_at: string
          duration_ms: number | null
          failed_validation: number
          id: string
          inserted: number
          metadata: Json | null
          provider_errors: Json | null
          provider_stats: Json | null
          skipped_duplicates: number
          status: string
          total_fetched: number
          total_valid: number
        }
        Insert: {
          category_stats?: Json | null
          created_at?: string
          duration_ms?: number | null
          failed_validation?: number
          id?: string
          inserted?: number
          metadata?: Json | null
          provider_errors?: Json | null
          provider_stats?: Json | null
          skipped_duplicates?: number
          status?: string
          total_fetched?: number
          total_valid?: number
        }
        Update: {
          category_stats?: Json | null
          created_at?: string
          duration_ms?: number | null
          failed_validation?: number
          id?: string
          inserted?: number
          metadata?: Json | null
          provider_errors?: Json | null
          provider_stats?: Json | null
          skipped_duplicates?: number
          status?: string
          total_fetched?: number
          total_valid?: number
        }
        Relationships: []
      }
      intelligence_embeddings: {
        Row: {
          content_hash: string
          created_at: string | null
          embedding: string | null
          embedding_json: Json | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          model: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          content_hash: string
          created_at?: string | null
          embedding?: string | null
          embedding_json?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          model?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          content_hash?: string
          created_at?: string | null
          embedding?: string | null
          embedding_json?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          model?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_embeddings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_snapshots: {
        Row: {
          build_duration_ms: number | null
          built_at: string
          id: string
          snapshot: Json
          tenant_id: string | null
          version: number
        }
        Insert: {
          build_duration_ms?: number | null
          built_at?: string
          id?: string
          snapshot: Json
          tenant_id?: string | null
          version?: number
        }
        Update: {
          build_duration_ms?: number | null
          built_at?: string
          id?: string
          snapshot?: Json
          tenant_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      monetization_events: {
        Row: {
          article_slug: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          placement_type: string | null
          slot_id: string | null
          tenant_id: string | null
        }
        Insert: {
          article_slug?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          placement_type?: string | null
          slot_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          article_slug?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          placement_type?: string | null
          slot_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monetization_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      monetization_placements: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          id: string
          label: string | null
          placement_type: string
          priority: number
          slot_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string | null
          placement_type?: string
          priority?: number
          slot_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string | null
          placement_type?: string
          priority?: number
          slot_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monetization_placements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      news_ai_queue: {
        Row: {
          article_id: number
          created_at: string
          error: string | null
          id: string
          processed_at: string | null
          processing_started_at: string | null
          status: string
        }
        Insert: {
          article_id: number
          created_at?: string
          error?: string | null
          id?: string
          processed_at?: string | null
          processing_started_at?: string | null
          status?: string
        }
        Update: {
          article_id?: number
          created_at?: string
          error?: string | null
          id?: string
          processed_at?: string | null
          processing_started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_ai_queue_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "news_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      news_articles: {
        Row: {
          ai_headline: string | null
          ai_processed_at: string | null
          ai_summary: string | null
          article_url: string | null
          author: string | null
          category: string | null
          content: string | null
          created_at: string | null
          description: string | null
          id: number
          image_url: string | null
          language: string | null
          published_at: string | null
          region: string | null
          slug: string | null
          source: string | null
          title: string | null
          title_hash: string | null
          translations: Json | null
          updated_at: string | null
          url_hash: string | null
        }
        Insert: {
          ai_headline?: string | null
          ai_processed_at?: string | null
          ai_summary?: string | null
          article_url?: string | null
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          description?: string | null
          id?: never
          image_url?: string | null
          language?: string | null
          published_at?: string | null
          region?: string | null
          slug?: string | null
          source?: string | null
          title?: string | null
          title_hash?: string | null
          translations?: Json | null
          updated_at?: string | null
          url_hash?: string | null
        }
        Update: {
          ai_headline?: string | null
          ai_processed_at?: string | null
          ai_summary?: string | null
          article_url?: string | null
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          description?: string | null
          id?: never
          image_url?: string | null
          language?: string | null
          published_at?: string | null
          region?: string | null
          slug?: string | null
          source?: string | null
          title?: string | null
          title_hash?: string | null
          translations?: Json | null
          updated_at?: string | null
          url_hash?: string | null
        }
        Relationships: []
      }
      news_events: {
        Row: {
          canonical_title: string
          category: string | null
          cluster_confidence: number | null
          clustering_metadata: Json
          coverage_headline: string | null
          coverage_slug: string | null
          coverage_status: string
          created_at: string
          event_summary: string | null
          id: string
          is_live: boolean
          region: string | null
          signal_ids: string[]
          source_count: number
          tenant_id: string | null
          updated_at: string
          urgency_score: number
        }
        Insert: {
          canonical_title: string
          category?: string | null
          cluster_confidence?: number | null
          clustering_metadata?: Json
          coverage_headline?: string | null
          coverage_slug?: string | null
          coverage_status?: string
          created_at?: string
          event_summary?: string | null
          id?: string
          is_live?: boolean
          region?: string | null
          signal_ids?: string[]
          source_count?: number
          tenant_id?: string | null
          updated_at?: string
          urgency_score?: number
        }
        Update: {
          canonical_title?: string
          category?: string | null
          cluster_confidence?: number | null
          clustering_metadata?: Json
          coverage_headline?: string | null
          coverage_slug?: string | null
          coverage_status?: string
          created_at?: string
          event_summary?: string | null
          id?: string
          is_live?: boolean
          region?: string | null
          signal_ids?: string[]
          source_count?: number
          tenant_id?: string | null
          updated_at?: string
          urgency_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "news_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      news_signals: {
        Row: {
          article_url: string
          category: string
          created_at: string
          geo_metadata: Json | null
          id: string
          image_url: string | null
          ingestion_metadata: Json
          language: string | null
          provider: string
          published_at: string | null
          raw_content: string | null
          region: string | null
          source: string | null
          tenant_id: string | null
          title: string
        }
        Insert: {
          article_url: string
          category?: string
          created_at?: string
          geo_metadata?: Json | null
          id?: string
          image_url?: string | null
          ingestion_metadata?: Json
          language?: string | null
          provider: string
          published_at?: string | null
          raw_content?: string | null
          region?: string | null
          source?: string | null
          tenant_id?: string | null
          title: string
        }
        Update: {
          article_url?: string
          category?: string
          created_at?: string
          geo_metadata?: Json | null
          id?: string
          image_url?: string | null
          ingestion_metadata?: Json
          language?: string | null
          provider?: string
          published_at?: string | null
          raw_content?: string | null
          region?: string | null
          source?: string | null
          tenant_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_signals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          confirmed_at: string | null
          created_at: string
          email: string
          id: string
          newsletter_id: string
          status: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: string
          newsletter_id: string
          status?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          newsletter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_subscribers_newsletter_id_fkey"
            columns: ["newsletter_id"]
            isOneToOne: false
            referencedRelation: "newsletters"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletters: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          frequency: string
          id: string
          name_en: string
          name_hi: string | null
          slug: string
          tenant_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          frequency?: string
          id?: string
          name_en: string
          name_hi?: string | null
          slug: string
          tenant_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          frequency?: string
          id?: string
          name_en?: string
          name_hi?: string | null
          slug?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      newsroom_activity_events: {
        Row: {
          actor_email: string
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json
          summary: string
          tenant_id: string
        }
        Insert: {
          actor_email: string
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          summary: string
          tenant_id: string
        }
        Update: {
          actor_email?: string
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          summary?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_activity_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      newsroom_approval_requests: {
        Row: {
          approver_user_id: string | null
          article_id: string
          created_at: string
          id: string
          message: string | null
          requested_by: string
          requested_by_email: string
          resolved_at: string | null
          response_note: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          approver_user_id?: string | null
          article_id: string
          created_at?: string
          id?: string
          message?: string | null
          requested_by: string
          requested_by_email: string
          resolved_at?: string | null
          response_note?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          approver_user_id?: string | null
          article_id?: string
          created_at?: string
          id?: string
          message?: string | null
          requested_by?: string
          requested_by_email?: string
          resolved_at?: string | null
          response_note?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_approval_requests_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "generated_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsroom_approval_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      newsroom_chat_messages: {
        Row: {
          author_email: string
          author_user_id: string | null
          body: string
          channel: string
          created_at: string
          id: string
          mentions: string[]
          tenant_id: string
        }
        Insert: {
          author_email: string
          author_user_id?: string | null
          body: string
          channel?: string
          created_at?: string
          id?: string
          mentions?: string[]
          tenant_id: string
        }
        Update: {
          author_email?: string
          author_user_id?: string | null
          body?: string
          channel?: string
          created_at?: string
          id?: string
          mentions?: string[]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_chat_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      newsroom_doc_heads: {
        Row: {
          article_id: string
          content_hash: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          article_id: string
          content_hash?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          article_id?: string
          content_hash?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_doc_heads_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: true
            referencedRelation: "generated_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsroom_doc_heads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      newsroom_doc_operations: {
        Row: {
          article_id: string
          content_hash: string | null
          created_at: string
          id: string
          op_type: string
          payload: Json
          tenant_id: string
          user_email: string
          user_id: string
          version: number
        }
        Insert: {
          article_id: string
          content_hash?: string | null
          created_at?: string
          id?: string
          op_type: string
          payload: Json
          tenant_id: string
          user_email: string
          user_id: string
          version: number
        }
        Update: {
          article_id?: string
          content_hash?: string | null
          created_at?: string
          id?: string
          op_type?: string
          payload?: Json
          tenant_id?: string
          user_email?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_doc_operations_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "generated_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsroom_doc_operations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      newsroom_editor_locks: {
        Row: {
          acquired_at: string
          article_id: string
          expires_at: string
          heartbeat_at: string
          locked_by: string
          locked_by_email: string
          tenant_id: string
        }
        Insert: {
          acquired_at?: string
          article_id: string
          expires_at: string
          heartbeat_at?: string
          locked_by: string
          locked_by_email: string
          tenant_id: string
        }
        Update: {
          acquired_at?: string
          article_id?: string
          expires_at?: string
          heartbeat_at?: string
          locked_by?: string
          locked_by_email?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_editor_locks_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: true
            referencedRelation: "generated_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsroom_editor_locks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      newsroom_inline_comments: {
        Row: {
          anchor_id: string
          article_id: string
          author_email: string
          author_user_id: string | null
          body: string
          created_at: string
          id: string
          mentions: string[]
          resolved: boolean
          selection: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          anchor_id?: string
          article_id: string
          author_email: string
          author_user_id?: string | null
          body: string
          created_at?: string
          id?: string
          mentions?: string[]
          resolved?: boolean
          selection?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          anchor_id?: string
          article_id?: string
          author_email?: string
          author_user_id?: string | null
          body?: string
          created_at?: string
          id?: string
          mentions?: string[]
          resolved?: boolean
          selection?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_inline_comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "generated_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsroom_inline_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      newsroom_notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          payload: Json
          read_at: string | null
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      newsroom_tenants: {
        Row: {
          config: Json
          created_at: string
          domains: string[]
          id: string
          name: string | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          domains?: string[]
          id?: string
          name?: string | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          domains?: string[]
          id?: string
          name?: string | null
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ops_cron_runs: {
        Row: {
          created_at: string
          degraded: boolean | null
          duration_ms: number | null
          error: string | null
          id: string
          job: string
          ok: boolean
          workers: Json | null
        }
        Insert: {
          created_at?: string
          degraded?: boolean | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          job: string
          ok?: boolean
          workers?: Json | null
        }
        Update: {
          created_at?: string
          degraded?: boolean | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          job?: string
          ok?: boolean
          workers?: Json | null
        }
        Relationships: []
      }
      ops_error_events: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          request_id: string | null
          resolved: boolean | null
          route: string | null
          severity: string
          source: string
          worker: string | null
        }
        Insert: {
          created_at?: string
          id: string
          message: string
          metadata?: Json | null
          request_id?: string | null
          resolved?: boolean | null
          route?: string | null
          severity: string
          source: string
          worker?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          request_id?: string | null
          resolved?: boolean | null
          route?: string | null
          severity?: string
          source?: string
          worker?: string | null
        }
        Relationships: []
      }
      openai_usage_events: {
        Row: {
          id: string
          created_at: string
          worker: string | null
          operation: string
          cron_job: string | null
          article_id: string | null
          event_id: string | null
          tenant_id: string | null
          model: string
          endpoint: string
          input_tokens: number
          output_tokens: number
          cached_tokens: number
          estimated_cost_usd: number
          latency_ms: number | null
          retry_count: number
          success: boolean
          prompt_hash: string | null
          prompt_chars: number | null
          completion_chars: number | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          worker?: string | null
          operation: string
          cron_job?: string | null
          article_id?: string | null
          event_id?: string | null
          tenant_id?: string | null
          model: string
          endpoint: string
          input_tokens?: number
          output_tokens?: number
          cached_tokens?: number
          estimated_cost_usd?: number
          latency_ms?: number | null
          retry_count?: number
          success?: boolean
          prompt_hash?: string | null
          prompt_chars?: number | null
          completion_chars?: number | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          worker?: string | null
          operation?: string
          cron_job?: string | null
          article_id?: string | null
          event_id?: string | null
          tenant_id?: string | null
          model?: string
          endpoint?: string
          input_tokens?: number
          output_tokens?: number
          cached_tokens?: number
          estimated_cost_usd?: number
          latency_ms?: number | null
          retry_count?: number
          success?: boolean
          prompt_hash?: string | null
          prompt_chars?: number | null
          completion_chars?: number | null
          metadata?: Json | null
        }
        Relationships: []
      }
      openai_prompt_cache: {
        Row: {
          id: string
          prompt_hash: string
          operation: string
          worker: string
          cache_version: string
          article_id: string | null
          event_id: string | null
          model: string
          result_json: import("@/types/json").JsonObject
          input_tokens: number
          output_tokens: number
          estimated_cost_usd: number
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          prompt_hash: string
          operation: string
          worker: string
          cache_version?: string
          article_id?: string | null
          event_id?: string | null
          model: string
          result_json: import("@/types/json").JsonObject
          input_tokens?: number
          output_tokens?: number
          estimated_cost_usd?: number
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          prompt_hash?: string
          operation?: string
          worker?: string
          cache_version?: string
          article_id?: string | null
          event_id?: string | null
          model?: string
          result_json?: import("@/types/json").JsonObject
          input_tokens?: number
          output_tokens?: number
          estimated_cost_usd?: number
          created_at?: string
          expires_at?: string
        }
        Relationships: []
      }
      executive_report_snapshots: {
        Row: {
          id: string
          created_at: string
          period: string
          format: string
          exchange_rate: number | null
          payload: Json
        }
        Insert: {
          id?: string
          created_at?: string
          period: string
          format: string
          exchange_rate?: number | null
          payload?: Json
        }
        Update: {
          id?: string
          created_at?: string
          period?: string
          format?: string
          exchange_rate?: number | null
          payload?: Json
        }
        Relationships: []
      }
      executive_alert_events: {
        Row: {
          id: string
          created_at: string
          alert_type: string
          severity: string
          message: string
          payload: Json
          acknowledged_at: string | null
          notified_email: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          alert_type: string
          severity: string
          message: string
          payload?: Json
          acknowledged_at?: string | null
          notified_email?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          alert_type?: string
          severity?: string
          message?: string
          payload?: Json
          acknowledged_at?: string | null
          notified_email?: boolean
        }
        Relationships: []
      }
      platform_ai_logs: {
        Row: {
          article_id: string | null
          created_at: string
          id: string
          job_type: string
          payload: Json
          result: Json | null
          status: string
        }
        Insert: {
          article_id?: string | null
          created_at?: string
          id?: string
          job_type: string
          payload?: Json
          result?: Json | null
          status?: string
        }
        Update: {
          article_id?: string | null
          created_at?: string
          id?: string
          job_type?: string
          payload?: Json
          result?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_ai_logs_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "platform_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_article_sources: {
        Row: {
          articles_fetched_24h: number
          category: string | null
          consecutive_failures: number
          created_at: string
          enabled: boolean
          failure_count: number
          health_status: string
          id: string
          language: string | null
          last_success_at: string | null
          name: string
          region: string | null
          reliability_score: number
          source_id: string | null
          tier: string | null
          trust_score: number
          updated_at: string
          url: string | null
        }
        Insert: {
          articles_fetched_24h?: number
          category?: string | null
          consecutive_failures?: number
          created_at?: string
          enabled?: boolean
          failure_count?: number
          health_status?: string
          id?: string
          language?: string | null
          last_success_at?: string | null
          name: string
          region?: string | null
          reliability_score?: number
          source_id?: string | null
          tier?: string | null
          trust_score?: number
          updated_at?: string
          url?: string | null
        }
        Update: {
          articles_fetched_24h?: number
          category?: string | null
          consecutive_failures?: number
          created_at?: string
          enabled?: boolean
          failure_count?: number
          health_status?: string
          id?: string
          language?: string | null
          last_success_at?: string | null
          name?: string
          region?: string | null
          reliability_score?: number
          source_id?: string | null
          tier?: string | null
          trust_score?: number
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      platform_articles: {
        Row: {
          ai_summary: string | null
          category: string
          content: string | null
          created_at: string
          district_slug: string | null
          excerpt: string | null
          id: string
          image_url: string | null
          is_breaking: boolean
          language: string
          priority: number
          published_at: string
          seo_description: string | null
          seo_keywords: string[] | null
          seo_title: string | null
          slug: string
          source_name: string | null
          tags: string[]
          title: string
          trending_score: number
          updated_at: string
          views: number
        }
        Insert: {
          ai_summary?: string | null
          category: string
          content?: string | null
          created_at?: string
          district_slug?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_breaking?: boolean
          language?: string
          priority?: number
          published_at?: string
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug: string
          source_name?: string | null
          tags?: string[]
          title: string
          trending_score?: number
          updated_at?: string
          views?: number
        }
        Update: {
          ai_summary?: string | null
          category?: string
          content?: string | null
          created_at?: string
          district_slug?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_breaking?: boolean
          language?: string
          priority?: number
          published_at?: string
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug?: string
          source_name?: string | null
          tags?: string[]
          title?: string
          trending_score?: number
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "platform_articles_district_slug_fkey"
            columns: ["district_slug"]
            isOneToOne: false
            referencedRelation: "platform_districts"
            referencedColumns: ["slug"]
          },
        ]
      }
      platform_breaking_news: {
        Row: {
          article_id: string | null
          created_at: string
          expires_at: string | null
          headline: string
          id: string
          is_active: boolean
          priority: number
          slug: string | null
        }
        Insert: {
          article_id?: string | null
          created_at?: string
          expires_at?: string | null
          headline: string
          id?: string
          is_active?: boolean
          priority?: number
          slug?: string | null
        }
        Update: {
          article_id?: string | null
          created_at?: string
          expires_at?: string | null
          headline?: string
          id?: string
          is_active?: boolean
          priority?: number
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_breaking_news_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "platform_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_config: {
        Row: {
          category: string
          config_key: string
          config_value: Json
          description: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          config_key: string
          config_value?: Json
          description?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          config_key?: string
          config_value?: Json
          description?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_districts: {
        Row: {
          article_count_cache: number
          created_at: string
          editor_user_ids: string[]
          enabled: boolean
          homepage_config: Json
          metadata: Json
          name_en: string
          name_hi: string
          priority_tier: number
          sections: string[]
          slug: string
          trend_score: number
          updated_at: string
        }
        Insert: {
          article_count_cache?: number
          created_at?: string
          editor_user_ids?: string[]
          enabled?: boolean
          homepage_config?: Json
          metadata?: Json
          name_en: string
          name_hi: string
          priority_tier?: number
          sections?: string[]
          slug: string
          trend_score?: number
          updated_at?: string
        }
        Update: {
          article_count_cache?: number
          created_at?: string
          editor_user_ids?: string[]
          enabled?: boolean
          homepage_config?: Json
          metadata?: Json
          name_en?: string
          name_hi?: string
          priority_tier?: number
          sections?: string[]
          slug?: string
          trend_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_topics: {
        Row: {
          ai_keyword_suggestions: string[]
          article_count_cache: number
          content_types: string[]
          created_at: string
          description_en: string | null
          description_hi: string | null
          enabled: boolean
          keywords: string[]
          seo_description: string | null
          seo_title: string | null
          slug: string
          title_en: string
          title_hi: string
          trend_score: number
          updated_at: string
        }
        Insert: {
          ai_keyword_suggestions?: string[]
          article_count_cache?: number
          content_types?: string[]
          created_at?: string
          description_en?: string | null
          description_hi?: string | null
          enabled?: boolean
          keywords?: string[]
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          title_en: string
          title_hi: string
          trend_score?: number
          updated_at?: string
        }
        Update: {
          ai_keyword_suggestions?: string[]
          article_count_cache?: number
          content_types?: string[]
          created_at?: string
          description_en?: string | null
          description_hi?: string | null
          enabled?: boolean
          keywords?: string[]
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          title_en?: string
          title_hi?: string
          trend_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      premium_reports: {
        Row: {
          content_path: string | null
          created_at: string
          excerpt: string | null
          hero_image_url: string | null
          id: string
          is_paywalled: boolean
          metadata: Json
          price_inr: number
          published_at: string | null
          slug: string
          tenant_id: string
          title: string
        }
        Insert: {
          content_path?: string | null
          created_at?: string
          excerpt?: string | null
          hero_image_url?: string | null
          id?: string
          is_paywalled?: boolean
          metadata?: Json
          price_inr?: number
          published_at?: string | null
          slug: string
          tenant_id: string
          title: string
        }
        Update: {
          content_path?: string | null
          created_at?: string
          excerpt?: string | null
          hero_image_url?: string | null
          id?: string
          is_paywalled?: boolean
          metadata?: Json
          price_inr?: number
          published_at?: string | null
          slug?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reader_analytics_events: {
        Row: {
          article_slug: string | null
          category: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          region: string | null
          session_hash: string | null
          surface: string | null
          tenant_id: string | null
          value_num: number | null
        }
        Insert: {
          article_slug?: string | null
          category?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          region?: string | null
          session_hash?: string | null
          surface?: string | null
          tenant_id?: string | null
          value_num?: number | null
        }
        Update: {
          article_slug?: string | null
          category?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          region?: string | null
          session_hash?: string | null
          surface?: string | null
          tenant_id?: string | null
          value_num?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reader_analytics_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reader_plans: {
        Row: {
          active: boolean
          billing_interval: string
          created_at: string
          features: Json
          id: string
          name_en: string
          name_hi: string | null
          price_inr: number
          slug: string
          sort_order: number
          stripe_price_id: string | null
          tenant_id: string
        }
        Insert: {
          active?: boolean
          billing_interval?: string
          created_at?: string
          features?: Json
          id?: string
          name_en: string
          name_hi?: string | null
          price_inr?: number
          slug: string
          sort_order?: number
          stripe_price_id?: string | null
          tenant_id: string
        }
        Update: {
          active?: boolean
          billing_interval?: string
          created_at?: string
          features?: Json
          id?: string
          name_en?: string
          name_hi?: string | null
          price_inr?: number
          slug?: string
          sort_order?: number
          stripe_price_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reader_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reader_subscriptions: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json
          plan_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reader_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "reader_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reader_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rss_source_health: {
        Row: {
          consecutive_failures: number
          disabled_until: string | null
          failure_count: number
          last_failure: string | null
          last_success: string | null
          name: string
          source_id: string
          updated_at: string
        }
        Insert: {
          consecutive_failures?: number
          disabled_until?: string | null
          failure_count?: number
          last_failure?: string | null
          last_success?: string | null
          name: string
          source_id: string
          updated_at?: string
        }
        Update: {
          consecutive_failures?: number
          disabled_until?: string | null
          failure_count?: number
          last_failure?: string | null
          last_success?: string | null
          name?: string
          source_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      schema_registry: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      security_audit_events: {
        Row: {
          action: string
          actor_email: string | null
          actor_user_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json
          resource_id: string | null
          resource_type: string | null
          tenant_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          resource_id?: string | null
          resource_type?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          resource_id?: string | null
          resource_type?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_audit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      security_devices: {
        Row: {
          device_fingerprint: string
          first_seen_at: string
          id: string
          label: string | null
          last_seen_at: string
          trusted: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          device_fingerprint: string
          first_seen_at?: string
          id?: string
          label?: string | null
          last_seen_at?: string
          trusted?: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          device_fingerprint?: string
          first_seen_at?: string
          id?: string
          label?: string | null
          last_seen_at?: string
          trusted?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      security_login_events: {
        Row: {
          created_at: string
          device_fingerprint: string | null
          email: string | null
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_fingerprint?: string | null
          email?: string | null
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_fingerprint?: string | null
          email?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_login_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      security_permission_changes: {
        Row: {
          changed_by_email: string | null
          changed_by_user_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          new_role: string | null
          new_status: string | null
          previous_role: string | null
          previous_status: string | null
          target_email: string | null
          target_user_id: string | null
          tenant_id: string
        }
        Insert: {
          changed_by_email?: string | null
          changed_by_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_role?: string | null
          new_status?: string | null
          previous_role?: string | null
          previous_status?: string | null
          target_email?: string | null
          target_user_id?: string | null
          tenant_id: string
        }
        Update: {
          changed_by_email?: string | null
          changed_by_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_role?: string | null
          new_status?: string | null
          previous_role?: string | null
          previous_status?: string | null
          target_email?: string | null
          target_user_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_permission_changes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      security_sessions: {
        Row: {
          country_code: string | null
          created_at: string
          device_fingerprint: string | null
          expires_at: string
          id: string
          ip_address: unknown
          last_seen_at: string
          revoke_reason: string | null
          revoked_at: string | null
          session_token_hash: string
          tenant_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          device_fingerprint?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          last_seen_at?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          session_token_hash: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          country_code?: string | null
          created_at?: string
          device_fingerprint?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          last_seen_at?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          session_token_hash?: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      source_reputation_memory: {
        Row: {
          credibility_score: number
          history: Json
          id: string
          last_seen_at: string | null
          misinfo_incidents: number
          reputation_score: number
          source_key: string
          source_name: string
          tenant_id: string | null
          total_signals: number
          updated_at: string
          verified_hits: number
        }
        Insert: {
          credibility_score?: number
          history?: Json
          id?: string
          last_seen_at?: string | null
          misinfo_incidents?: number
          reputation_score?: number
          source_key: string
          source_name: string
          tenant_id?: string | null
          total_signals?: number
          updated_at?: string
          verified_hits?: number
        }
        Update: {
          credibility_score?: number
          history?: Json
          id?: string
          last_seen_at?: string | null
          misinfo_incidents?: number
          reputation_score?: number
          source_key?: string
          source_name?: string
          tenant_id?: string | null
          total_signals?: number
          updated_at?: string
          verified_hits?: number
        }
        Relationships: [
          {
            foreignKeyName: "source_reputation_memory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsored_stories: {
        Row: {
          active_from: string | null
          active_until: string | null
          article_slug: string
          created_at: string
          cta_label: string | null
          cta_url: string | null
          disclosure_en: string
          disclosure_hi: string | null
          id: string
          metadata: Json
          sponsor_logo_url: string | null
          sponsor_name: string
          tenant_id: string
        }
        Insert: {
          active_from?: string | null
          active_until?: string | null
          article_slug: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          disclosure_en?: string
          disclosure_hi?: string | null
          id?: string
          metadata?: Json
          sponsor_logo_url?: string | null
          sponsor_name: string
          tenant_id: string
        }
        Update: {
          active_from?: string | null
          active_until?: string | null
          article_slug?: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          disclosure_en?: string
          disclosure_hi?: string | null
          id?: string
          metadata?: Json
          sponsor_logo_url?: string | null
          sponsor_name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsored_stories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_api_requests: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          latency_ms: number | null
          metadata: Json
          method: string
          provider: string | null
          route: string
          status_code: number | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          metadata?: Json
          method?: string
          provider?: string | null
          route: string
          status_code?: number | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          metadata?: Json
          method?: string
          provider?: string | null
          route?: string
          status_code?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_api_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_billing: {
        Row: {
          api_calls_limit: number
          api_calls_used: number
          articles_limit: number
          articles_used: number
          current_period_end: string | null
          current_period_start: string | null
          metadata: Json
          plan_id: string
          plan_status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          api_calls_limit?: number
          api_calls_used?: number
          articles_limit?: number
          articles_used?: number
          current_period_end?: string | null
          current_period_start?: string | null
          metadata?: Json
          plan_id?: string
          plan_status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          api_calls_limit?: number
          api_calls_used?: number
          articles_limit?: number
          articles_used?: number
          current_period_end?: string | null
          current_period_start?: string | null
          metadata?: Json
          plan_id?: string
          plan_status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_billing_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_memberships: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          invited_by: string | null
          joined_at: string | null
          last_login_at: string | null
          metadata: Json
          permissions: Json
          role: string
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          last_login_at?: string | null
          metadata?: Json
          permissions?: Json
          role?: string
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          last_login_at?: string | null
          metadata?: Json
          permissions?: Json
          role?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      user_two_factor: {
        Row: {
          backup_codes_hash: string[] | null
          created_at: string
          enabled_at: string | null
          totp_secret_encrypted: string
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_codes_hash?: string[] | null
          created_at?: string
          enabled_at?: string | null
          totp_secret_encrypted: string
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_codes_hash?: string[] | null
          created_at?: string
          enabled_at?: string | null
          totp_secret_encrypted?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      worker_dead_letters: {
        Row: {
          attempts: number
          dedupe_key: string
          failed_at: string
          id: string
          job_id: string | null
          job_type: string
          last_error: string | null
          metadata: Json
          payload: Json
          tenant_id: string | null
        }
        Insert: {
          attempts?: number
          dedupe_key: string
          failed_at?: string
          id?: string
          job_id?: string | null
          job_type: string
          last_error?: string | null
          metadata?: Json
          payload?: Json
          tenant_id?: string | null
        }
        Update: {
          attempts?: number
          dedupe_key?: string
          failed_at?: string
          id?: string
          job_id?: string | null
          job_type?: string
          last_error?: string | null
          metadata?: Json
          payload?: Json
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_dead_letters_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "worker_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_dead_letters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_job_runs: {
        Row: {
          created_at: string
          duration_ms: number
          error: string | null
          id: string
          job_id: string | null
          job_type: string | null
          metadata: Json
          ok: boolean
          skipped: boolean
          tenant_id: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number
          error?: string | null
          id?: string
          job_id?: string | null
          job_type?: string | null
          metadata?: Json
          ok?: boolean
          skipped?: boolean
          tenant_id?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number
          error?: string | null
          id?: string
          job_id?: string | null
          job_type?: string | null
          metadata?: Json
          ok?: boolean
          skipped?: boolean
          tenant_id?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_job_runs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "worker_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_job_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_jobs: {
        Row: {
          attempts: number
          claimed_at: string | null
          completed_at: string | null
          created_at: string
          dedupe_key: string
          id: string
          job_type: string
          last_error: string | null
          max_attempts: number
          payload: Json
          priority: number
          result: Json | null
          scheduled_at: string
          status: string
          tenant_id: string | null
          timeout_ms: number
          updated_at: string
        }
        Insert: {
          attempts?: number
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          dedupe_key: string
          id?: string
          job_type: string
          last_error?: string | null
          max_attempts?: number
          payload?: Json
          priority?: number
          result?: Json | null
          scheduled_at?: string
          status?: string
          tenant_id?: string | null
          timeout_ms?: number
          updated_at?: string
        }
        Update: {
          attempts?: number
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          dedupe_key?: string
          id?: string
          job_type?: string
          last_error?: string | null
          max_attempts?: number
          payload?: Json
          priority?: number
          result?: Json | null
          scheduled_at?: string
          status?: string
          tenant_id?: string | null
          timeout_ms?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "newsroom_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_ai_queue_batch: {
        Args: { claim_limit?: number; stale_reclaim_minutes?: number }
        Returns: { article_id: number }[]
      }
      claim_editorial_image_batch: {
        Args: { claim_limit?: number }
        Returns: Database["public"]["Tables"]["editorial_image_queue"]["Row"][]
      }
      get_schema_health: { Args: never; Returns: Json }
      match_intelligence_embeddings: {
        Args: {
          filter_entity_type?: string
          filter_tenant_id?: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          entity_id: string
          entity_type: string
          metadata: Json
          similarity: number
        }[]
      }
      reload_postgrest_schema: { Args: never; Returns: undefined }
      security_is_super_admin: {
        Args: { p_tenant_id?: string }
        Returns: boolean
      }
      security_user_has_tenant: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
      security_user_tenant_ids: { Args: never; Returns: string[] }
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
