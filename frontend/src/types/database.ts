export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          id: string
          page_title: string
          pc_number: number
          session_id: string
          timestamp: string
          url: string
        }
        Insert: {
          id?: string
          page_title?: string
          pc_number: number
          session_id: string
          timestamp?: string
          url: string
        }
        Update: {
          id?: string
          page_title?: string
          pc_number?: number
          session_id?: string
          timestamp?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_documents: {
        Row: {
          class_number: number
          created_at: string
          end_date: string
          grade: number
          id: string
          purpose: string
          start_date: string
          status: Database["public"]["Enums"]["approval_status"]
          student_name: string
          updated_at: string
        }
        Insert: {
          class_number: number
          created_at?: string
          end_date: string
          grade: number
          id?: string
          purpose: string
          start_date: string
          status?: Database["public"]["Enums"]["approval_status"]
          student_name: string
          updated_at?: string
        }
        Update: {
          class_number?: number
          created_at?: string
          end_date?: string
          grade?: number
          id?: string
          purpose?: string
          start_date?: string
          status?: Database["public"]["Enums"]["approval_status"]
          student_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      blocked_domains: {
        Row: {
          created_at: string
          description: string | null
          domain: string
          id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          domain: string
          id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          domain?: string
          id?: string
        }
        Relationships: []
      }
      entry_records: {
        Row: {
          approval_id: string | null
          class_number: number
          entry_time: string
          expected_end_time: string | null
          grade: number
          id: string
          needs_approval: boolean
          pc_number: number
          purpose: string
          status: Database["public"]["Enums"]["entry_status"]
          student_name: string
        }
        Insert: {
          approval_id?: string | null
          class_number: number
          entry_time?: string
          expected_end_time?: string | null
          grade: number
          id?: string
          needs_approval?: boolean
          pc_number: number
          purpose: string
          status?: Database["public"]["Enums"]["entry_status"]
          student_name: string
        }
        Update: {
          approval_id?: string | null
          class_number?: number
          entry_time?: string
          expected_end_time?: string | null
          grade?: number
          id?: string
          needs_approval?: boolean
          pc_number?: number
          purpose?: string
          status?: Database["public"]["Enums"]["entry_status"]
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_records_approval_id_fkey"
            columns: ["approval_id"]
            isOneToOne: false
            referencedRelation: "approval_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_records_pc_number_fkey"
            columns: ["pc_number"]
            isOneToOne: false
            referencedRelation: "pc_seats"
            referencedColumns: ["pc_number"]
          },
        ]
      }
      pc_seats: {
        Row: {
          current_entry_id: string | null
          current_student_name: string | null
          pc_number: number
          status: Database["public"]["Enums"]["pc_status"]
          updated_at: string
        }
        Insert: {
          current_entry_id?: string | null
          current_student_name?: string | null
          pc_number: number
          status?: Database["public"]["Enums"]["pc_status"]
          updated_at?: string
        }
        Update: {
          current_entry_id?: string | null
          current_student_name?: string | null
          pc_number?: number
          status?: Database["public"]["Enums"]["pc_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_current_entry"
            columns: ["current_entry_id"]
            isOneToOne: false
            referencedRelation: "entry_records"
            referencedColumns: ["id"]
          },
        ]
      }
      session_logs: {
        Row: {
          end_time: string | null
          entry_id: string
          id: string
          pc_number: number
          start_time: string
        }
        Insert: {
          end_time?: string | null
          entry_id: string
          id?: string
          pc_number: number
          start_time?: string
        }
        Update: {
          end_time?: string | null
          entry_id?: string
          id?: string
          pc_number?: number
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_logs_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entry_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_logs_pc_number_fkey"
            columns: ["pc_number"]
            isOneToOne: false
            referencedRelation: "pc_seats"
            referencedColumns: ["pc_number"]
          },
        ]
      }
      violation_events: {
        Row: {
          action_taken: Database["public"]["Enums"]["violation_action"] | null
          activity_description: string
          id: string
          pc_number: number
          session_id: string
          timestamp: string
          url: string
        }
        Insert: {
          action_taken?: Database["public"]["Enums"]["violation_action"] | null
          activity_description?: string
          id?: string
          pc_number: number
          session_id: string
          timestamp?: string
          url?: string
        }
        Update: {
          action_taken?: Database["public"]["Enums"]["violation_action"] | null
          activity_description?: string
          id?: string
          pc_number?: number
          session_id?: string
          timestamp?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "violation_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_logs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      approval_status: "ACTIVE" | "EXPIRED" | "REVOKED"
      entry_status: "WAITING" | "USING" | "FINISHED" | "BLOCKED"
      pc_status: "LOCKED" | "ACTIVE" | "SESSION_END"
      violation_action: "LOCKED" | "WARNING" | "IGNORED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type ApprovalDocument = Database['public']['Tables']['approval_documents']['Row']
export type EntryRecord = Database['public']['Tables']['entry_records']['Row']
export type SessionLog = Database['public']['Tables']['session_logs']['Row']
export type ActivityLog = Database['public']['Tables']['activity_logs']['Row']
export type ViolationEvent = Database['public']['Tables']['violation_events']['Row']
export type PcSeat = Database['public']['Tables']['pc_seats']['Row']
export type BlockedDomain = Database['public']['Tables']['blocked_domains']['Row']

export type EntryStatus = Database['public']['Enums']['entry_status']
export type PcStatus = Database['public']['Enums']['pc_status']
export type ViolationAction = Database['public']['Enums']['violation_action']
export type ApprovalStatus = Database['public']['Enums']['approval_status']
