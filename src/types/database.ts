import { createClient } from "@supabase/supabase-js";

export type Database = {
  public: {
    Tables: {
      oil_collections: {
        Row: {
          id: string;
          operator_key: string;
          citizen_phone: string;
          reward_brl: number;
          collected_at: string;
          liters: number;
          photo_url: string | null;
          tx_hash: string | null;
          pix_status: string | null;
        };
        Insert: {
          id?: string;
          operator_key: string;
          citizen_phone: string;
          reward_brl?: number;
          collected_at?: string;
          liters: number;
          photo_url?: string | null;
          tx_hash?: string | null;
          pix_status?: string | null;
        };
      };
      oil_config: {
        Row: {
          id: string;
          key: string;
          value: string;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: string;
          updated_by?: string | null;
          updated_at?: string;
        };                                                                              
      };
    };
  };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);