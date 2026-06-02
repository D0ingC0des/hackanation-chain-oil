use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke,
};

use crate::errors::ChainOilError;

const TOKEN_2022_PROGRAM_ID: &str = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

#[derive(Accounts)]
pub struct BurnCot<'info> {
    /// Operador que possui os tokens — único signatário necessário
    #[account(mut)]
    pub operator: Signer<'info>,

    /// Conta de token do operador (Token-2022)
    /// CHECK: Token-2022 valida owner e program
    #[account(mut)]
    pub operator_token_account: AccountInfo<'info>,

    /// Mint COT (Token-2022)
    /// CHECK: Token-2022 valida o mint
    #[account(mut)]
    pub cot_mint: AccountInfo<'info>,

    /// Deve ser o Token-2022 program
    /// CHECK: validado por key comparison abaixo
    pub token_program: AccountInfo<'info>,
}

pub fn handler(ctx: Context<BurnCot>, amount: u64) -> Result<()> {
    require!(amount > 0, ChainOilError::InvalidLiters);

    let expected = TOKEN_2022_PROGRAM_ID
        .parse::<Pubkey>()
        .map_err(|_| error!(ChainOilError::InvalidTokenProgram))?;

    require!(
        *ctx.accounts.token_program.key == expected,
        ChainOilError::InvalidTokenProgram
    );

    // SPL Token / Token-2022 burn: discriminator=8, amount=u64 LE
    let mut data = Vec::with_capacity(9);
    data.push(8u8);
    data.extend_from_slice(&amount.to_le_bytes());

    let ix = Instruction {
        program_id: expected,
        accounts: vec![
            AccountMeta::new(*ctx.accounts.operator_token_account.key, false),
            AccountMeta::new(*ctx.accounts.cot_mint.key, false),
            AccountMeta::new_readonly(*ctx.accounts.operator.key, true),
        ],
        data,
    };

    invoke(
        &ix,
        &[
            ctx.accounts.operator_token_account.to_account_info(),
            ctx.accounts.cot_mint.to_account_info(),
            ctx.accounts.operator.to_account_info(),
        ],
    )
    .map_err(|_| error!(ChainOilError::BurnFailed))?;

    msg!(
        "ChainOil: queimou {} COT | operator={}",
        amount,
        ctx.accounts.operator.key()
    );

    Ok(())
}
