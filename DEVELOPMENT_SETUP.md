# Local Ask Cemetery development setup

This stage connects the existing React UI to local Ollama only. This repository is a React 19 / Vite / Tailwind web application with a desktop-style design, not yet an Electron, Tauri, or native Windows executable. `src/main.tsx` mounts `src/App.tsx`; its Ask component and dashboard input use the same local connection.

## 1. Required software

- Windows, Node.js 22.18+ (or Node 24), and npm or pnpm.
- Ollama for Windows: https://ollama.com/download/windows
- Existing project dependencies. From this project directory, run `npm install` (or `pnpm install --frozen-lockfile`). No additional AI packages are required.

Installation and the initial model download require internet. Inference does not.

## 2. Ollama installation

Install Ollama and reopen your terminal so `ollama` is on PATH. Verify with `ollama --version` and `Get-Command ollama` in PowerShell. The application discovers the executable using PATH; it does not assume an installation folder. Start Menu shortcuts and model blob directories are not executable paths and are not used by the bridge.

## 3. Required Qwen model

Install exactly this model yourself:

```powershell
ollama pull qwen2.5:3b-instruct
ollama create qwen-fast -f ./Modelfile
ollama list
```

The application never downloads models, and never substitutes larger models. The included Modelfile builds qwen-fast from the installed 3B model with num_ctx 2048 and num_predict 512. Registration reuses the existing weight layer and adds only profile metadata, not another full model. The fast profile is selected in .env.local. The bridge does not override its context/output parameters. These are defaults, not a lock against other clients overriding them. No GPU driver, CUDA, power, clock, or Windows security changes are required.

## 4. Verify Ollama

```powershell
Invoke-RestMethod http://127.0.0.1:11434/api/tags
```

If unavailable, run `ollama serve`. If Ollama is already serving, use that instance instead.

Optional: copy `.env.example` to `.env.local` in this directory. Configuration is read by `llm/config.ts` through Vite at server startup:

```dotenv
OLLAMA_HOST=127.0.0.1:11434
OLLAMA_MODEL=qwen-fast:latest
```

Restart the application after configuration changes. qwen-fast:latest is the default; the original qwen2.5:3b-instruct is also accepted with the same small request limits. Remote hosts and other models are rejected. There is no model dropdown; this configuration selects the model for the unchanged UI.

## 5. Start the application

From this project directory:

```powershell
npm start
```

This starts the local app server and opens the existing UI at `http://127.0.0.1:8443`. Keep the terminal open. `npm run dev` starts the same bridge without opening a browser. If the app is already running, open that address instead of starting another server. The app server binds only to loopback.

For a built local preview, use `npm run build`, then `npm run preview`. Preview also includes the local bridge. Opening `dist/index.html` directly or hosting the static build alone does not provide the bridge.

## 6. Automatic Ollama startup

On each local app server launch, the bridge checks `/api/tags`. If Ollama responds, it reuses the service. Otherwise it checks for an existing Windows Ollama process, waits for a cold process, or locates `ollama` on PATH and starts `ollama serve` with a hidden window. It rechecks before starting, shares concurrent initialization checks, and waits up to approximately 30 seconds for the local API. It then verifies the exact model is installed. Each question checks availability again to support recovery.

Missing installation, failed startup, and missing models produce setup messages in Ask Cemetery. Technical details are logged to the application terminal/browser console. The service is left running when the app closes. Model loading occurs on the first question; generation has a 120-second timeout.

## 7. Test Ask Cemetery

Open Ask Cemetery, or submit a question from the dashboard. Use the chat composer and Send message button. Enter sends; Shift + Enter adds a new line. Suggested questions start a conversation, and New chat clears it. Follow-up questions keep recent complete turns within a conservative small-context budget. Older turns may be omitted from the model request while remaining visible in the chat. Character counts approximate tokens; Ollama enforces its actual 2,048-token window. General cemetery land information questions are supported without a records database. Chat history is held in memory and is cleared on refresh or cemetery change. Test:

1. With Ollama already running, launch the app; confirm the ready message and no additional Ollama service process.
2. Exit Ollama completely, including its tray application, then relaunch the app; confirm automatic startup and the ready message.
3. Ask: `Hello, introduce yourself as the Cemetery GeoAI assistant.` A model response should appear in the existing answer card.
4. Ask: `Where is Juan Dela Cruz buried?` The model should state that the burial information is unavailable; no records are supplied.
5. After dependencies and the model are installed, disconnect internet manually and repeat both questions. All inference requests use loopback only.
6. Submit an empty input; confirm the message requesting a question.

Developer checks: `npm run typecheck`, `npm run build`, and `npm run test:llm`. Automated tests simulate startup and failure paths without stopping an existing Ollama service or changing network settings.

## 8. Known limitations

- No cemetery database, retrieval/RAG, GIS querying, or answer grounding is implemented.
- The controlled system prompt requests honest unavailable-data responses. A language model can still make mistakes; its output is not a verified record.
- This is a local development app, not a packaged Windows installer. Dependencies and model must already be present for offline use.
- The existing UI references Google Fonts. Offline font rendering may use its fallback fonts; this does not affect local inference. Global styling was preserved.
- One message is generated at a time. Session chat history is supported; there is no saved history or streaming.
- Other screens retain their existing design and placeholder content. Existing database status labels do not establish a real database connection.
- The UI talks only to `src/llm/client.ts`; `/api/llm/status` and `/api/llm/ask` are the runtime-neutral bridge contract. `llm/llmClient.ts` defines `LocalLlm`; replace its runtime adapter and startup manager to change local runtimes later.
- Requests are same-origin, JSON-only, size-limited, and served on loopback. Model output is rendered as React text, never injected as HTML (XSS protection). Origin checks protect the local POST endpoint from cross-site submissions.

API references: https://docs.ollama.com/api/chat and https://docs.ollama.com/api/tags

Verification on October 2, 2026: type checking, production build, and all 11 automated tests passed. Live tests verified reuse of the running service, automatic startup after stopping Ollama, both specified questions through Ask Cemetery, empty-input handling, and rejection of cross-origin bridge requests. Qwen stated that Juan Dela Cruz's burial information was unavailable. Physical internet disconnection was not performed; the manual offline test above remains to be run. No AI call uses a remote endpoint.

Performance-profile verification on October 2, 2026: qwen-fast:latest reuses the original 3B weight layer; Ollama reports context_length 2048 and approximately 2.08 GB model memory. Build, type checking, and 16 tests passed. The initial app request timed out at 120 seconds; a subsequent direct one-word check took 9.47 seconds, and a warm one-word request through the application bridge took 2.38 seconds. These are individual short checks, not a general latency guarantee. Longer replies, cold loading, or competing work can still take longer. No dependencies, larger model downloads, or hardware/system configuration changes were added.
