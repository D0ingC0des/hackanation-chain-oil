use anchor_lang::prelude::*;

use crate::errors::ChainOilError;
use crate::state::OilOracleState;

// ── initialize_oracle ────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeOracle<'info> {
    #[account(mut)]
    pub deployer: Signer<'info>,

    #[account(
        init,
        payer = deployer,
        space = OilOracleState::LEN,
        seeds = [OilOracleState::SEED],
        bump
    )]
    pub oracle_state: Account<'info, OilOracleState>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_oracle_handler(
    ctx: Context<InitializeOracle>,
    authority: Pubkey,
    initial_price: u64,
) -> Result<()> {
    require!(
        initial_price >= 50 && initial_price <= 2000,
        ChainOilError::InvalidPrice
    );

    let state = &mut ctx.accounts.oracle_state;
    state.current_price = initial_price;
    state.last_update = Clock::get()?.unix_timestamp;
    state.update_count = 0;
    state.authority = authority;
    state.bump = ctx.bumps.oracle_state;

    msg!(
        "OilOracle: inicializado | preco={} centavos/L | authority={}",
        initial_price,
        authority
    );
    Ok(())
}

// ── update_price ─────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct UpdateOilPrice<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [OilOracleState::SEED],
        bump = oracle_state.bump,
        has_one = authority @ ChainOilError::UnauthorizedAuthority
    )]
    pub oracle_state: Account<'info, OilOracleState>,
}

/// Atualiza o preço do óleo on-chain. Somente a authority (wallet do CRE) pode chamar.
/// `source_timestamp`: unix timestamp da leitura na API ChainOil — deve ser mais recente
/// que o último update para prevenir replays.
pub fn update_price_handler(
    ctx: Context<UpdateOilPrice>,
    new_price: u64,
    source_timestamp: i64,
) -> Result<()> {
    let state = &mut ctx.accounts.oracle_state;
    let now = Clock::get()?.unix_timestamp;

    require!(source_timestamp > state.last_update, ChainOilError::StaleUpdate);
    require!(
        new_price >= 50 && new_price <= 2000,
        ChainOilError::InvalidPrice
    );

    let old_price = state.current_price;
    state.current_price = new_price;
    state.last_update = now;
    state.update_count = state.update_count.checked_add(1).unwrap();

    msg!(
        "OilOracle: {} -> {} centavos/L | update #{} | ts={}",
        old_price,
        new_price,
        state.update_count,
        now
    );
    Ok(())
}
