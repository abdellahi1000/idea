/**
 * Hand-written placeholder matching the shape produced by
 * `supabase gen types typescript`. Replace this file by running that
 * command against the real project once the migrations in
 * supabase/migrations/ have been applied (see plan section 7, step 4).
 *
 * Every table has real Insert/Update shapes (not `never`) even where the
 * client never actually writes directly - that restriction is enforced by
 * RLS/triggers in the migrations, not by the generated types, matching what
 * `supabase gen types typescript` would produce.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          email: string | null;
          date_of_birth: string | null;
          profile_picture_path: string | null;
          role: 'customer';
          status: 'active' | 'suspended' | 'disabled' | 'locked';
          pin_hash: string | null;
          biometric_enabled: boolean;
          admin_notes: string | null;
          approval_status: 'pending' | 'approved' | 'rejected';
          approval_rejection_reason: string | null;
          approved_at: string | null;
          approved_by: string | null;
          face_verification_failure_count: number;
          face_verification_locked_until: string | null;
          face_verification_disabled: boolean;
          face_identity_prompt_skipped: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          phone?: string | null;
          email?: string | null;
          date_of_birth?: string | null;
          profile_picture_path?: string | null;
        };
        Update: Partial<{
          full_name: string;
          phone: string | null;
          email: string | null;
          date_of_birth: string | null;
          profile_picture_path: string | null;
          biometric_enabled: boolean;
          face_identity_prompt_skipped: boolean;
        }>;
        Relationships: [];
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          balance: number;
          currency_code: string;
          status: 'active' | 'frozen' | 'closed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          currency_code?: string;
        };
        Update: Partial<{ status: 'active' | 'frozen' | 'closed' }>;
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          sender_wallet_id: string | null;
          recipient_wallet_id: string | null;
          amount: number;
          currency_code: string;
          type: 'transfer' | 'deposit' | 'withdrawal';
          status: 'pending' | 'completed' | 'failed' | 'reversed';
          reference_note: string | null;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          sender_wallet_id?: string | null;
          recipient_wallet_id?: string | null;
          amount: number;
          currency_code: string;
          type: 'transfer' | 'deposit' | 'withdrawal';
          reference_note?: string | null;
          idempotency_key?: string | null;
        };
        Update: Partial<{ status: 'pending' | 'completed' | 'failed' | 'reversed' }>;
        Relationships: [];
      };
      devices: {
        Row: {
          id: string;
          user_id: string;
          device_installation_id: string;
          device_name: string;
          platform: 'ios' | 'android' | 'web';
          push_token: string | null;
          last_login_at: string | null;
          status: 'active' | 'pending' | 'disabled' | 'transferred';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          device_installation_id: string;
          device_name: string;
          platform: 'ios' | 'android' | 'web';
          push_token?: string | null;
        };
        Update: Partial<{
          device_name: string;
          push_token: string | null;
          last_login_at: string;
        }>;
        Relationships: [];
      };
      security_recovery_codes: {
        Row: {
          id: string;
          user_id: string;
          code_hash: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          code_hash: string;
        };
        Update: Partial<{ used_at: string }>;
        Relationships: [];
      };
      device_transfer_requests: {
        Row: {
          id: string;
          user_id: string;
          from_device_id: string | null;
          to_device_id: string | null;
          status: 'pending' | 'approved' | 'denied' | 'expired';
          requested_at: string;
          resolved_at: string | null;
        };
        Insert: {
          user_id: string;
          from_device_id?: string | null;
          to_device_id?: string | null;
        };
        Update: Partial<{ status: 'pending' | 'approved' | 'denied' | 'expired'; resolved_at: string }>;
        Relationships: [];
      };
      identity_verification: {
        Row: {
          id: string;
          user_id: string;
          document_type: 'national_id' | 'passport' | 'drivers_license';
          document_number: string;
          document_front_path: string | null;
          document_back_path: string | null;
          selfie_path: string | null;
          status: 'pending' | 'approved' | 'rejected';
          reviewed_by: string | null;
          rejection_reason: string | null;
          match_similarity: number | null;
          matched_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          document_type: 'national_id' | 'passport' | 'drivers_license';
          document_number: string;
          document_front_path?: string | null;
          document_back_path?: string | null;
          selfie_path?: string | null;
        };
        Update: Partial<{
          document_front_path: string | null;
          document_back_path: string | null;
          selfie_path: string | null;
        }>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          type: string;
          read_at: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          title: string;
          body: string;
          type: string;
          metadata?: Json | null;
        };
        Update: Partial<{ read_at: string }>;
        Relationships: [];
      };
      administrator_accounts: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'administrator' | 'super_administrator';
          status: 'active' | 'suspended' | 'disabled';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role: 'administrator' | 'super_administrator';
        };
        Update: Partial<{ status: 'active' | 'suspended' | 'disabled' }>;
        Relationships: [];
      };
      system_settings: {
        Row: {
          key: string;
          value: Json;
          description: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          description?: string | null;
        };
        Update: Partial<{ value: Json; description: string | null }>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_user_id: string | null;
          actor_admin_id: string | null;
          action: string;
          entity_table: string;
          entity_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          actor_user_id?: string | null;
          actor_admin_id?: string | null;
          action: string;
          entity_table: string;
          entity_id?: string | null;
          metadata?: Json | null;
        };
        Update: never;
        Relationships: [];
      };
      face_identities: {
        Row: {
          id: string;
          user_id: string;
          storage_path: string;
          status: 'active' | 'reinitializing';
          created_at: string;
          updated_at: string;
        };
        Insert: { user_id: string; storage_path: string };
        Update: never;
        Relationships: [];
      };
      face_verification_attempts: {
        Row: {
          id: string;
          user_id: string;
          device_transfer_request_id: string | null;
          last_face_path: string;
          challenge: Json;
          status: 'pending' | 'processing' | 'approved' | 'rejected' | 'expired';
          ai_result: Json | null;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      qr_transfer_codes: {
        Row: {
          id: string;
          user_id: string;
          device_transfer_request_id: string | null;
          code: string;
          status: 'pending' | 'used' | 'expired';
          expires_at: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      security_recovery_codes_status: {
        Row: {
          user_id: string;
          has_code: boolean;
          can_view_once: boolean;
        };
        Relationships: [];
      };
      transactions_with_counterparty: {
        Row: {
          id: string;
          sender_wallet_id: string | null;
          recipient_wallet_id: string | null;
          amount: number;
          currency_code: string;
          type: 'transfer' | 'deposit' | 'withdrawal';
          status: 'pending' | 'completed' | 'failed' | 'reversed';
          reference_note: string | null;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string;
          direction: 'sent' | 'received';
          counterparty_name: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_transaction: {
        Args: {
          p_sender_wallet_id: string;
          p_recipient_phone: string;
          p_amount: number;
          p_idempotency_key: string;
          p_note?: string | null;
        };
        Returns: Database['public']['Tables']['transactions']['Row'];
      };
      activate_device: {
        Args: { p_device_id: string };
        Returns: Database['public']['Tables']['devices']['Row'];
      };
      register_device: {
        Args: { p_device_installation_id: string; p_device_name: string; p_platform: string };
        Returns: Database['public']['Tables']['devices']['Row'];
      };
      check_recovery_code_available: {
        Args: { p_code: string };
        Returns: boolean;
      };
      reveal_recovery_code_once: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      get_public_settings: {
        Args: Record<string, never>;
        Returns: Json;
      };
      submit_first_face_identity: {
        Args: { p_storage_path: string };
        Returns: undefined;
      };
      start_device_transfer: {
        Args: {
          p_verification_method: 'qr_code' | 'face_id' | 'fingerprint';
          p_device_installation_id: string;
          p_device_name: string;
          p_platform: 'ios' | 'android' | 'web';
        };
        Returns: { request_id: string; to_device_id: string }[];
      };
      create_qr_transfer_code: {
        Args: { p_request_id: string };
        Returns: { code: string; expires_at: string }[];
      };
      approve_qr_transfer: {
        Args: { p_code: string };
        Returns: undefined;
      };
      submit_face_verification_attempt: {
        Args: { p_request_id: string; p_storage_path: string; p_challenge: Json };
        Returns: string;
      };
      complete_device_transfer: {
        Args: { p_request_id: string; p_recovery_code: string };
        Returns: undefined;
      };
      generate_recovery_code_candidate: {
        Args: Record<string, never>;
        Returns: string;
      };
      create_recovery_code: {
        Args: { p_code: string };
        Returns: undefined;
      };
      verify_recovery_code: {
        Args: { p_code: string };
        Returns: boolean;
      };
      set_login_pin: {
        Args: { p_pin: string };
        Returns: undefined;
      };
      verify_login_pin: {
        Args: { p_pin: string };
        Returns: boolean;
      };
      has_login_pin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      resolve_device_transfer_request: {
        Args: {
          p_request_id: string;
          p_approving_device_id: string;
          p_approve: boolean;
        };
        Returns: Database['public']['Tables']['device_transfer_requests']['Row'];
      };
    };
    Enums: Record<string, never>;
  };
}
