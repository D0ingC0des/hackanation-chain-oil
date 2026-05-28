use anchor_lang::prelude::*;

#[error_code]
pub enum ChainOilError {
    #[msg("Chainlink feed não é o owner esperado")]
    InvalidFeedOwner,
    #[msg("Dado do Chainlink está desatualizado (staleness > 3600s)")]
    StaleFeedData,
    #[msg("Litros inválidos — deve ser > 0")]
    InvalidLiters,
}
