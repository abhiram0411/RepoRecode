# Architecture diagrams

## Learning and evidence

```mermaid
flowchart LR
  A[Public GitHub or local source] --> B[Bounded import worker]
  B --> C[Immutable source snapshot]
  C --> D[TypeScript compiler index]
  D --> E[Source facts and dependency lessons]
  E --> F[Monaco practice draft]
  F --> G[Disposable QuickJS evaluation]
  C --> G
  G --> H[Observed probe results]
  H --> I[Device progress and achievements]
  F --> J[React server render in QuickJS]
  J --> K[Sanitized React HTML snapshot]
  K --> L[Validated element source mapping]
  L --> E
```

Probe results cover finite cases. Initial React mode skips events/effects; interactive mode runs synchronous handlers, state and effects in QuickJS and replaces sanitized HTML. Parent listeners forward bounded event data; the frame cannot execute scripts. A separate function-entry timeline shows bounded VM observations. Static import, call and component edges remain static evidence.

## Optional connected services

```mermaid
flowchart TB
  U[Browser workspace] -->|Explicit consent and bearer session| G[Node gateway]
  U -->|Owner policies| S[Supabase projects and preferences]
  G -->|Identity verification| A[Supabase Auth]
  G -->|Service only quota and usage RPC| S
  G -->|Selected source context only| M[Configured model provider]
  G -->|Encrypted owner grant| H[GitHub App API]
  O[Trusted operator with MFA] --> G
  W[Separate hosted watchdog] -->|Health checks| G
  W -->|Configured incidents and recovery| N[Email or Telegram]
```

The static public site does not host the Node gateway. Connected services need owner configuration and live acceptance. GitHub authorization state currently requires one gateway replica or sticky routing; automatic cross-device conflict merging is not implemented.
