use anchor_lang::prelude::*;

/// PDA que armazena uma coleta registrada on-chain.
/// Seeds: ["collection", operator.key, collection_seq (u64 as le bytes)]
#[account]
#[derive(Default)]
pub struct Collection {
    /// Carteira do operador/estabelecimento
    pub operator: Pubkey,           // 32
    /// Litros coletados × 1000 (3 casas decimais sem float)
    pub liters_ml: u64,             // 8
    /// Recompensa em BRL × 100 (centavos)
    pub reward_centavos: u64,       // 8
    /// Preço SOL/USD no momento — resposta do Chainlink × 10^8
    pub sol_usd_price: i128,        // 16
    /// Decimais do feed Chainlink (normalmente 8)
    pub sol_usd_decimals: u8,       // 1
    /// ID da coleta no Supabase (UUID como bytes) para cross-referência
    pub supabase_id: [u8; 16],      // 16
    /// Timestamp Unix da coleta
    pub collected_at: i64,          // 8
    /// Sequência do operador (incrementada a cada coleta)
    pub seq: u64,                   // 8
    /// Bump do PDA
    pub bump: u8,                   // 1
}

impl Collection {
    // 8 (discriminator) + 32 + 8 + 8 + 16 + 1 + 16 + 8 + 8 + 1 = 106
    pub const LEN: usize = 8 + 32 + 8 + 8 + 16 + 1 + 16 + 8 + 8 + 1;
}

/// PDA que mantém o contador de coletas de um operador.
/// Seeds: ["operator_state", operator.key]
#[account]
#[derive(Default)]
pub struct OperatorState {
    pub operator: Pubkey,   // 32
    pub total_collections: u64, // 8
    pub bump: u8,           // 1
}

impl OperatorState {
    pub const LEN: usize = 8 + 32 + 8 + 1; // 49
}

/// PDA global que armazena o preço atual do óleo (atualizado pelo Chainlink CRE).
/// Seeds: [b"oil_oracle"]
#[account]
pub struct OilOracleState {
    /// Preço do óleo em centavos BRL por litro (ex: 120 = R$1,20/L)
    pub current_price: u64,   // 8
    /// Timestamp Unix da última atualização
    pub last_update: i64,     // 8
    /// Contador de updates — proteção anti-replay
    pub update_count: u64,    // 8
    /// Única carteira autorizada a chamar update_price (wallet do CRE)
    pub authority: Pubkey,    // 32
    pub bump: u8,             // 1
}

impl OilOracleState {
    // 8 (discriminator) + 8 + 8 + 8 + 32 + 1 = 65
    pub const LEN: usize = 8 + 8 + 8 + 8 + 32 + 1;
    pub const SEED: &'static [u8] = b"oil_oracle";
}
