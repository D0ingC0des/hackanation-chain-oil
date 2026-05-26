flowchart TD

    A([Usuário abre o app]) --> B{Wallet conectada?}

    B -- Não --> C["/index<br/>Tela de Login"]

    C --> D{Wallet instalada?}

    D -- Não --> E["Guia para instalar<br/>Phantom ou Backpack"]
    E --> D

    D -- Sim --> F["Botão Conectar Wallet<br/>Solana Wallet Adapter"]

    F --> G["Phantom / Backpack<br/>Handshake"]

    G --> H{"Perfil existe?<br/>SELECT wallet_profiles"}

    B -- Sim --> H

    H -- Não --> I["/onboarding<br/>Nome, Celular,<br/>Estabelecimento,<br/>CNPJ e CEP"]

    I --> J["INSERT wallet_profiles<br/>Supabase"]

    J --> K

    H -- Sim --> K["/collect<br/>Formulário de Coleta"]

    K --> L["Preenche:<br/>Celular<br/>Litros coletados<br/>Foto opcional"]

    L --> M["Confirmar Coleta"]

    M --> N{Existe foto?}

    N -- Sim --> O["sessionStorage<br/>chainoil_pending_photo"]

    N -- Não --> P

    O --> P["navigate /processing"]

    P --> Q["/processing<br/>Guard anti-duplo disparo"]

    Q --> R["Supabase Edge Function<br/>process-collection"]

    R --> S["SELECT oil_config<br/>rate_per_liter"]

    S --> T["rewardBrl = liters × rate"]

    T --> U["INSERT oil_collections"]

    U --> V{WOOVI_APP_ID configurado?}

    V -- Não --> W["pix_status = pending"]

    V -- Sim --> X["POST Woovi Transfer API"]

    X --> Y{Resposta Woovi}

    Y -- OK --> Z["UPDATE oil_collections<br/>pix_status = processing"]

    Y -- Erro --> AA["UPDATE oil_collections<br/>pix_status = failed"]

    Z --> AB["Retorna collectionId<br/>pixStatus e rewardBrl"]

    W --> AB

    AA --> AB

    AB --> AC{Existe foto no sessionStorage?}

    AC -- Sim --> AD["Converter base64 → Blob"]

    AD --> AE["Upload Supabase Storage"]

    AE --> AF["UPDATE photo_url"]

    AF --> AG

    AC -- Não --> AG

    AG["registerCollectionOnChain<br/>anchor-service.ts"]

    AG --> AH["Anchor Program<br/>Solana Devnet"]

    AH --> AI["Valida owner feed"]

    AI --> AJ["Read Chainlink SOL/USD"]

    AJ --> AK["Valida freshness"]

    AK --> AL["WRITE Collection PDA"]

    AL --> AM["Increment OperatorState PDA"]

    AM --> AN["Retorna tx signature"]

    AN --> AO["UPDATE tx_hash"]

    AO --> AP

    AG -. Skip se não deployado .-> AP["navigate /success"]

    AP --> AQ(["Tela Success<br/>PIX enviado<br/>CO₂ evitado"])

    subgraph SUPABASE["Supabase"]
        S
        T
        U
        Z
        AA
        AE
        AF
    end

    subgraph WOOVI["Woovi"]
        X
        Y
    end

    subgraph SOLANA["Solana Devnet"]
        AH
        AI
        AL
        AM
        AN
    end

    subgraph CHAINLINK["Chainlink"]
        AJ
        AK
    end

    style W fill:#f59e0b,color:#000
    style AA fill:#ef4444,color:#fff
    style Z fill:#22c55e,color:#fff
    style AG fill:#f59e0b,color:#000
    style AQ fill:#22c55e,color:#fff