use anchor_lang::prelude::*;

#[error_code]
pub enum ChainOilError {
    #[msg("Chainlink feed não é o owner esperado")]
    InvalidFeedOwner,
    #[msg("Dado do Chainlink está desatualizado (staleness > 3600s)")]
    StaleFeedData,
    #[msg("Litros inválidos — deve ser > 0")]
    InvalidLiters,
    #[msg("Autoridade inválida — somente o CRE pode atualizar o preço")]
    UnauthorizedAuthority,
    #[msg("Timestamp não é mais recente que o último update")]
    StaleUpdate,
    #[msg("Preço inválido — deve estar entre 50 e 2000 centavos (R$0,50–R$20,00)")]
    InvalidPrice,
}
