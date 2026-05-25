Chainlink
https://docs.chain.link/cre

Chainlink Runtime Environment (CRE)
Byzantino Fault Tolerant (BFT)

Usando o CRE SDK (disponível em Go e TypeScript), você constrói fluxos de trabalho. Usando a CLI do CRE, você os compila em binários e os implanta em produção, onde o CRE os executa em uma Rede Oracle Descentralizada (DON).

Construir e simular (disponível agora)
Você pode começar a construir e simular fluxos de trabalho de CRE imediatamente, sem qualquer aprovação:

Crie uma conta no app.chain.link/cre/discover para acessar a plataforma
Instale o CLI CRE na sua máquina
Construa fluxos de trabalho usando os SDKs Go ou TypeScript
Simule fluxos de trabalho para testar e depurar antes da implantação
A simulação compila seus fluxos de trabalho no WebAssembly (WASM) e os executa na sua máquina — mas faz chamadas reais para APIs ativas e blockchains públicas de EVM. Isso te dá confiança de que seu fluxo de trabalho funcionará como esperado quando enviado para um DON.

O modelo de gatilho e retorno
Os fluxos de trabalho utilizam um modelo de gatilho e retorno para proporcionar uma experiência de desenvolvedor centrada no código. Esse modelo é o principal padrão arquitetônico que você usará nos seus fluxos de trabalho. Consiste em três partes simples:

Um Gatilho: Uma fonte de evento que inicia a execução de um fluxo de trabalho (por exemplo, ). Esse é o "quando" do seu fluxo de trabalho.cron.Trigger
Um Callback: Uma função que contém sua lógica de negócios. É dentro dessa função que você usará os clientes do SDK para invocar capacidades. Esse é o "o quê" do seu fluxo de trabalho.
O handler(): A cola que conecta um único gatilho a um único callback.
Você pode definir múltiplas combinações de gatilhos e callback no seu fluxo de trabalho. Você também pode atribuir o mesmo callback a vários gatilhos para reutilização.