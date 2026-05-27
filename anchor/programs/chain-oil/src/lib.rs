use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod errors;

use instructions::register_collection::*;

declare_id!("CHAiNoiLXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"); // substituir após `anchor build`

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
}
