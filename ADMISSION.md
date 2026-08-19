# dsh-TUI Admission Notes

## Compatibility

- Community contract: v0.15 Draft / Experimental.
- Host facet: `v1alpha1`.
- Required core contract: `commands.dsh/v1alpha1` `Command`.
- TUI-only restriction: `experimental-contract`, because full-screen scenes are not a Community v0.15 contract.
- Runtime: local and headless-safe. The scene renders only when a TUI host exposes `tuiScenes`; the `/edit` command returns a visible error otherwise (no operation is assumed presentable). No remote-attach claim is made.

## Trust and permissions

The package runs `trusted-in-process`. `commands.invoke` is compatibility and governance metadata, not OS isolation. The plugin is strictly read-only: it performs no filesystem writes, creates no files, and deletes nothing. All reads are synchronous snapshots confined to the configured root (default: process cwd). No sandboxing or security certification is claimed.

## Effects and cleanup

The Cordis activation owns the `edit` command registration and owns a `file-browser` scene registration only when the host exposes the experimental scene service. Deactivation disposes every registration that was created. The plugin creates no timer, subscription, cache, or storage record; all file reads are synchronous snapshots held in component state and released with the scene. Uninstall removes registrations only; purge has no plugin-owned data to delete.

## Privacy

The plugin reads workspace files on the runtime machine only (never credentials stores or session logs). File content is never persisted, never logged, and never transmitted. No network access.

## Design constraints

The scene is snapshot-based end to end: files are read once on selection and re-read only on explicit rescan (`r`); nothing watches the filesystem. Previewed files are capped by `previewMaxBytes`/`previewMaxLines`; binary files (NUL bytes) are detected and shown as metadata only.
