use anchor_lang::prelude::*;
use chainlink_solana::v2::read_feed_v2;

use crate::errors::ChainOilError;
use crate::state::{Collection, OperatorState};

/// Program ID do OCR2 Data Feeds da Chainlink (Devnet e Mainnet)
const FEED_OWNER: &str = "HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny";

/// Feed SOL/USD Devnet
/// Verificar endereço atual em: https://docs.chain.link/data-feeds/price-feeds/addresses?network=solana
pub const SOL_USD_DEVNET: &str = "HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKegfthMvWdo";

/// Tolerância de freshness: 1 hora (feeds Solana heartbeat = 30s, mas usamos margem generosa para devnet)
const MAX_STALENESS_SECS: i64 = 3_600;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RegisterCollectionParams {
    /// Litros × 1000 (ex: 2.5L → 2500)
    pub liters_ml: u64,
    /// Recompensa calculada em centavos BRL (ex: R$ 3,00 → 300)
    pub reward_centavos: u64,
    /// UUID da coleta no Supabase como [u8; 16]
    pub supabase_id: [u8; 16],
}

#[derive(Accounts)]
#[instruction(params: RegisterCollectionParams)]
pub struct RegisterCollection<'info> {
    #[account(mut)]
    pub operator: Signer<'info>,

    /// PDA de estado do operador — criado automaticamente na primeira coleta
    #[account(
        init_if_needed,
        payer = operator,
        space = OperatorState::LEN,
        seeds = [b"operator_state", operator.key().as_ref()],
        bump
    )]
    pub operator_state: Account<'info, OperatorState>,

    /// PDA da coleta individual
    #[account(
        init,
        payer = operator,
        space = Collection::LEN,
        seeds = [
            b"collection",
            operator.key().as_ref(),
            &operator_state.total_collections.to_le_bytes()
        ],
        bump
    )]
    pub collection: Account<'info, Collection>,

    /// Conta do feed Chainlink SOL/USD (passada como AccountInfo para leitura via SDK)
    /// CHECK: validado pelo owner check abaixo dentro do handler
    pub chainlink_feed: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RegisterCollection>, params: RegisterCollectionParams) -> Result<()> {
    require!(params.liters_ml > 0, ChainOilError::InvalidLiters);

    // Validar owner do feed
    let feed_owner = ctx.accounts.chainlink_feed.owner;
    let expected_owner = FEED_OWNER.parse::<Pubkey>().unwrap();
    require!(
        *feed_owner == expected_owner,
        ChainOilError::InvalidFeedOwner
    );

    // Ler SOL/USD do Chainlink
    let feed_data = ctx.accounts.chainlink_feed.try_borrow_data()?;
    let feed = read_feed_v2(feed_data, expected_owner.to_bytes())
        .map_err(|_| error!(ChainOilError::InvalidFeedOwner))?;

    let round = feed.latest_round_data().ok_or(error!(ChainOilError::StaleFeedData))?;
    let decimals = feed.decimals();

    // Validar freshness (round.timestamp é u32 no chainlink_solana v2.0.8)
    let now = Clock::get()?.unix_timestamp;
    require!(
        now - round.timestamp as i64 <= MAX_STALENESS_SECS,
        ChainOilError::StaleFeedData
    );

    // Incrementar contador do operador
    let op_state = &mut ctx.accounts.operator_state;
    if op_state.operator == Pubkey::default() {
        op_state.operator = ctx.accounts.operator.key();
        op_state.bump = ctx.bumps.operator_state;
    }
    let seq = op_state.total_collections;
    op_state.total_collections = seq.checked_add(1).unwrap();

    // Preencher PDA da coleta
    let col = &mut ctx.accounts.collection;
    col.operator = ctx.accounts.operator.key();
    col.liters_ml = params.liters_ml;
    col.reward_centavos = params.reward_centavos;
    col.sol_usd_price = round.answer;
    col.sol_usd_decimals = decimals;
    col.supabase_id = params.supabase_id;
    col.collected_at = now;
    col.seq = seq;
    col.bump = ctx.bumps.collection;

    msg!(
        "ChainOil: {} mL, {} centavos BRL, SOL/USD={} (×10^{})",
        params.liters_ml,
        params.reward_centavos,
        round.answer,
        decimals
    );

    Ok(())
}
