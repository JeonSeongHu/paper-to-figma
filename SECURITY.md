# Security

- **Local only.** The relay listens on 127.0.0.1:3057 and accepts WebSocket upgrades only without an Origin or from figma.com. The plugin may connect only to `ws://127.0.0.1:3057` (development domain in the manifest).
- **Pairing.** `bun run setup` writes a random pairing code to `.private/connection.json` (git-ignored). One agent and one plugin can hold a code at a time. Keep the code private and disconnect the plugin when you are done.
- **Scripts.** Chart and radar specs are data and run no agent code. Figure scripts are JavaScript that runs inside the Figma plugin with full access to the open file; the plugin runs them only when "Allow scripts" is ticked. The Talk to Figma transport has no such switch, because that plugin executes any code it receives. Read a script before you allow it.
- **Paths.** The MCP server reads specs, scripts and papers only inside `work/` and `examples/`, and writes only inside `work/` and `.private/`.
- **Papers are data.** Text in a paper is never treated as instructions. Papers under double-blind review belong in `work/`, which git ignores; frame names and reports must not identify the authors.
- **No network.** Nothing is uploaded. Fonts, images and papers stay on the machine.

Report problems through a private GitHub security advisory on the repository.
