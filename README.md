# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## GenLayer contract integration

All app data is read from and written to the deployed Intelligent Contract
`0xE2D7988Fb0558a1D7c19374E7006925974BBC62d` (GenLayer Studio) via `genlayer-js`.
There is no browser-local simulation and no simulated validator logic.

- `contracts/agent_negotiator.py` — the Intelligent Contract source.
- `src/lib/negotiator/client.ts` — GenLayer client: `readContract` / `writeContract` (real transactions, results decoded from receipts).
- `src/lib/negotiator/store.tsx` — app workflow wired to the contract methods:
  - Reads: `list_agents`, `get_agent`, `list_deals`, `get_deal`, `get_history`, `get_verification`, `get_challenge`
  - Writes: `register_agent`, `post_deal`, `submit_proposal`, `generate_counteroffer`, `verify_agreement`, `challenge_agreement`, `attach_evidence`, `find_deals`
