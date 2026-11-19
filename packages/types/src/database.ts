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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      courses: {
        Row: {
          code: string | null
          created_at: string
          id: string
          level: Database["public"]["Enums"]["course_level"]
          name: string
          org_id: string
          parent_id: string | null
          section: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["course_level"]
          name: string
          org_id: string
          parent_id?: string | null
          section?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["course_level"]
          name?: string
          org_id?: string
          parent_id?: string | null
          section?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      org_users: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          is_active: boolean
          onboarding_completed: boolean
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          roll_number: string | null
          section_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          onboarding_completed?: boolean
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          roll_number?: string | null
          section_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          onboarding_completed?: boolean
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          roll_number?: string | null
          section_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_users_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_users_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          allowed_domains: string[]
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          mrr_cents: number
          name: string
          slug: string
          theme_config: Json
          tier: Database["public"]["Enums"]["org_tier"]
          updated_at: string
        }
        Insert: {
          allowed_domains?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          mrr_cents?: number
          name: string
          slug: string
          theme_config?: Json
          tier?: Database["public"]["Enums"]["org_tier"]
          updated_at?: string
        }
        Update: {
          allowed_domains?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          mrr_cents?: number
          name?: string
          slug?: string
          theme_config?: Json
          tier?: Database["public"]["Enums"]["org_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      student_results: {
        Row: {
          answers: Json
          anti_cheat_logs: Json
          created_at: string
          fullscreen_exits: number
          graded_at: string | null
          id: string
          org_id: string
          percentage: number | null
          question_breakdown: Json
          score: number
          status: string
          student_id: string
          submitted_at: string | null
          tab_switch_count: number
          teacher_blessing: string | null
          test_id: string
          total: number
          updated_at: string
        }
        Insert: {
          answers?: Json
          anti_cheat_logs?: Json
          created_at?: string
          fullscreen_exits?: number
          graded_at?: string | null
          id?: string
          org_id: string
          percentage?: number | null
          question_breakdown?: Json
          score?: number
          status?: string
          student_id: string
          submitted_at?: string | null
          tab_switch_count?: number
          teacher_blessing?: string | null
          test_id: string
          total?: number
          updated_at?: string
        }
        Update: {
          answers?: Json
          anti_cheat_logs?: Json
          created_at?: string
          fullscreen_exits?: number
          graded_at?: string | null
          id?: string
          org_id?: string
          percentage?: number | null
          question_breakdown?: Json
          score?: number
          status?: string
          student_id?: string
          submitted_at?: string | null
          tab_switch_count?: number
          teacher_blessing?: string | null
          test_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_results_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_assignments: {
        Row: {
          created_at: string
          id: string
          org_id: string
          section_id: string
          subject_name: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          section_id: string
          subject_name: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          section_id?: string
          subject_name?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      test_answer_keys: {
        Row: {
          correct_answer: string
          created_at: string
          explanation: string | null
          id: string
          marks: number
          options: Json
          org_id: string
          question_number: number
          question_text: string
          question_type: string
          test_id: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          explanation?: string | null
          id?: string
          marks?: number
          options?: Json
          org_id: string
          question_number: number
          question_text: string
          question_type?: string
          test_id: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          explanation?: string | null
          id?: string
          marks?: number
          options?: Json
          org_id?: string
          question_number?: number
          question_text?: string
          question_type?: string
          test_id?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_answer_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_answer_keys_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          anti_cheat_enabled: boolean
          blocks: Json
          course_id: string
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number
          expires_at: string | null
          id: string
          is_published: boolean
          org_id: string
          scheduled_at: string | null
          share_code: string | null
          subject: string | null
          target_section_ids: string[]
          title: string
          total_marks: number
          updated_at: string
        }
        Insert: {
          anti_cheat_enabled?: boolean
          blocks?: Json
          course_id: string
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number
          expires_at?: string | null
          id?: string
          is_published?: boolean
          org_id: string
          scheduled_at?: string | null
          share_code?: string | null
          subject?: string | null
          target_section_ids?: string[]
          title: string
          total_marks?: number
          updated_at?: string
        }
        Update: {
          anti_cheat_enabled?: boolean
          blocks?: Json
          course_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number
          expires_at?: string | null
          id?: string
          is_published?: boolean
          org_id?: string
          scheduled_at?: string | null
          share_code?: string | null
          subject?: string | null
          target_section_ids?: string[]
          title?: string
          total_marks?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          global_role: Database["public"]["Enums"]["user_role"]
          grading_blessings: Json
          id: string
          signature_url: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string
          global_role?: Database["public"]["Enums"]["user_role"]
          grading_blessings?: Json
          id: string
          signature_url?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          global_role?: Database["public"]["Enums"]["user_role"]
          grading_blessings?: Json
          id?: string
          signature_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_join_org_by_domain: { Args: { p_email: string }; Returns: string }
      get_org_leaderboard: {
        Args: { target_org_id: string }
        Returns: {
          avatar_url: string
          avg_percentage: number
          full_name: string
          rank: number
          student_id: string
          tests_completed: number
          total_score: number
        }[]
      }
    }
    Enums: {
      course_level: "COURSE" | "YEAR" | "SECTION"
      org_role: "ORG_ADMIN" | "TEACHER" | "STUDENT"
      org_tier: "FREE" | "CAMPUS" | "ENTERPRISE"
      user_role: "SUPER_ADMIN" | "ORG_ADMIN" | "TEACHER" | "STUDENT"
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
      course_level: ["COURSE", "YEAR", "SECTION"],
      org_role: ["ORG_ADMIN", "TEACHER", "STUDENT"],
      org_tier: ["FREE", "CAMPUS", "ENTERPRISE"],
      user_role: ["SUPER_ADMIN", "ORG_ADMIN", "TEACHER", "STUDENT"],
    },
  },
} as const
