# Cyberpunk Red Initiative Tracker

A cross-platform desktop app for running combat in *Cyberpunk Red* TTRPG sessions: tracks initiative order, HP, split armor (head/body) with the official ablation rules, wound states, and a reusable bestiary of enemy templates.

Built with **Tauri 2** (Rust desktop runtime, native OS webview) + **SvelteKit / Svelte 5** + **TypeScript** + **Vite**, packaged with **Bun**. Runs in well under 100 MB of RAM on low-end hardware — no Electron.

## Prerequisites

You need three toolchains on the host machine.

### 1. Bun

JavaScript runtime + package manager. Install from <https://bun.sh>:

```sh
curl -fsSL https://bun.sh/install | bash    # macOS / Linux
```

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"   # Windows
```

### 2. Rust toolchain

Required to compile the Tauri shell.

```sh
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh    # macOS / Linux
```

On Windows install [`rustup-init.exe`](https://rustup.rs).

### 3. Tauri system dependencies

Tauri uses the OS-native webview, so each platform needs a few extra libraries. Pick your OS:

**Linux (Debian / Ubuntu):**

```sh
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

For Fedora, Arch, Alpine, etc., see <https://tauri.app/start/prerequisites/>.

**macOS:**

```sh
xcode-select --install
```

**Windows:**

- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (select "Desktop development with C++")
- [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) — usually pre-installed on Windows 11

## Install

Clone the repo, then from the project root:

```sh
bun install
```

This pulls JS dependencies. Cargo crates are fetched automatically the first time you run a Tauri command.

## Development

Run the desktop app with hot-reload:

```sh
bun run tauri dev
```

The first run compiles the Rust shell (a few minutes). Subsequent runs are fast.

If you only want to iterate on the frontend in a browser (no native window):

```sh
bun run dev
```

Visit <http://localhost:1420>. Persistence still works via `localStorage`.

## Build a release bundle

```sh
bun run tauri build
```

Output lands in `src-tauri/target/release/bundle/`:

- Linux: `.deb`, `.rpm`, `.AppImage`
- macOS: `.app`, `.dmg`
- Windows: `.msi`, `.exe`

## Other useful scripts

```sh
bun run check          # type-check Svelte + TS
bun run check:watch    # type-check in watch mode
```

## Data storage

All sessions, encounters, and enemy templates are kept in the webview's `localStorage` (key `cpr-initiative-tracker/v1`). Inside Tauri this lives in the OS-managed app data directory — the data is yours and persists across runs. There is no cloud sync.

## Notes

- **Wayland + NVIDIA**: WebKitGTK's DMA-BUF renderer can fail with `Error 71 (Protocol error)` on this combo. The app sets `WEBKIT_DISABLE_DMABUF_RENDERER=1` automatically at startup (see `src-tauri/src/main.rs`), so no extra steps are needed.
- The default app window is 800×600. Change it in `src-tauri/tauri.conf.json` under `app.windows`.

## License

MIT.
