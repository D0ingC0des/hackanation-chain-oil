export type UserRole = "admin" | "partner" | "operator" | "citizen";
export type CollectionStatus = "pending" | "validated" | "rejected" | "rewarded";
export type RewardStatus = "pending" | "processing" | "paid" | "failed";
export type TransactionType = "pix" | "mint" | "burn";
export type TransactionStatus = "pending" | "success" | "failed";
export type WalletType = "custodial" | "external";
export type RedemptionStatus = "pending" | "approved" | "delivered" | "cancelled";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          role: UserRole;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      collection_points: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          latitude: number | null;
          longitude: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["collection_points"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["collection_points"]["Insert"]>;
      };
      operators: {
        Row: {
          id: string;
          profile_id: string | null;
          collection_point_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["operators"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["operators"]["Insert"]>;
      };
      wallets: {
        Row: {
          id: string;
          profile_id: string | null;
          wallet_address: string;
          encrypted_private_key: string | null;
          wallet_type: WalletType;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["wallets"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["wallets"]["Insert"]>;
      };
      collections: {
        Row: {
          id: string;
          citizen_id: string | null;
          operator_id: string | null;
          collection_point_id: string | null;
          liters: number;
          oil_quality_score: number;
          estimated_reward: number | null;
          estimated_tokens: number | null;
          status: CollectionStatus;
          proof_hash: string | null;
          tx_hash: string | null;
          photo_url: string | null;
          latitude: number | null;
          longitude: number | null;
          collected_at: string;
          validated_at: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["collections"]["Row"],
          "id" | "collected_at" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["collections"]["Insert"]>;
      };
      rewards: {
        Row: {
          id: string;
          collection_id: string | null;
          citizen_id: string | null;
          brl_amount: number;
          token_amount: number;
          pix_key: string | null;
          status: RewardStatus;
          processed_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["rewards"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["rewards"]["Insert"]>;
      };
      transactions: {
        Row: {
          id: string;
          profile_id: string | null;
          type: TransactionType;
          status: TransactionStatus;
          amount: number | null;
          tx_hash: string | null;
          external_id: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["transactions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
      };
      rankings: {
        Row: {
          id: string;
          citizen_id: string | null;
          total_points: number;
          total_tokens: number;
          total_liters: number;
          level: number;
          streak_days: number;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["rankings"]["Row"], "id" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["rankings"]["Insert"]>;
      };
      badges: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          icon: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["badges"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["badges"]["Insert"]>;
      };
      user_badges: {
        Row: {
          id: string;
          citizen_id: string | null;
          badge_id: string | null;
          earned_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["user_badges"]["Row"], "id" | "earned_at">;
        Update: Partial<Database["public"]["Tables"]["user_badges"]["Insert"]>;
      };
      esg_metrics: {
        Row: {
          id: string;
          collection_id: string | null;
          water_preserved_liters: number | null;
          co2_avoided_kg: number | null;
          impact_score: number | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["esg_metrics"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["esg_metrics"]["Insert"]>;
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity: string | null;
          entity_id: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["audit_logs"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      calculate_reward: {
        Args: { liters_input: number };
        Returns: number;
      };
    };
    Enums: {
      user_role: UserRole;
      collection_status: CollectionStatus;
      reward_status: RewardStatus;
      transaction_type: TransactionType;
      transaction_status: TransactionStatus;
      wallet_type: WalletType;
      redemption_status: RedemptionStatus;
    };
  };
}
