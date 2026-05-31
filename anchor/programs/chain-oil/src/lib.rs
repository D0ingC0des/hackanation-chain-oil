use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod errors;

use instructions::register_collection::*;
use instructions::oracle::*;

declare_id!("49NBUcWMprgym8gqFegGEVisvcEqHe5RgHmpzmKdaaDy");

#[program]
pub mod chain_oil {
    use super::*;

    /// Registra uma coleta de óleo usado na blockchain.
    /// Lê o preço SOL/USD do Chainlink para atestar o valor em USD no momento da coleta.
    pub fn register_collection(
        ctx: Context<RegisterCollection>,
        params: RegisterCollectionParams,
    ) -> Result<()> {
        instructions::register_collection::handler(ctx, params)
    }

    /// Cria o PDA OilOracleState. Chamado uma vez pelo deployer após o deploy.
    /// `authority`: carteira do CRE que poderá chamar update_price.
    /// `initial_price`: preço inicial em centavos BRL/L (ex: 120 = R$1,20).
    pub fn initialize_oracle(
        ctx: Context<InitializeOracle>,
        authority: Pubkey,
        initial_price: u64,
    ) -> Result<()> {
        instructions::oracle::initialize_oracle_handler(ctx, authority, initial_price)
    }

    /// Atualiza o preço do óleo on-chain. Somente a authority (CRE) pode chamar.
    /// `new_price`: novo preço em centavos BRL/L.
    /// `source_timestamp`: unix timestamp da leitura na API — proteção anti-replay.
    pub fn update_price(
        ctx: Context<UpdateOilPrice>,
        new_price: u64,
        source_timestamp: i64,
    ) -> Result<()> {
        instructions::oracle::update_price_handler(ctx, new_price, source_timestamp)
    }
}
