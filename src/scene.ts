import type { TuiSceneDescriptor, TuiSceneProps } from '@deepseek-harness-tui/dsh-tui/scenes'
import { readPreview, walkFiles, type FileEntry, type Preview } from './files.js'

export interface SceneOptions {
  root: string
  ignoreDirs: readonly string[]
  maxEntries: number
  previewMaxBytes: number
  previewMaxLines: number
}

/**
 * The browser scene: one focused tree column with a snapshot preview that
 * follows the cursor (ranger model). Read-only by design: files are read
 * once per selection, nothing watches the filesystem, and `r` re-walks the
 * tree. The plugin performs no filesystem writes.
 */
export function createFileBrowserScene(options: SceneOptions): TuiSceneDescriptor['component'] {
  return function FileBrowserScene({ React, ui, close }: TuiSceneProps) {
    const { Box, Text, useInput, useTerminalSize } = ui
    const { columns, rows } = useTerminalSize()
    const [entries, setEntries] = React.useState<FileEntry[] | undefined>()
    const [cursor, setCursor] = React.useState(0)
    const [preview, setPreview] = React.useState<Preview | undefined>()
    const [previewScroll, setPreviewScroll] = React.useState(0)
    const [reload, setReload] = React.useState(0)

    React.useEffect(() => {
      setEntries(walkFiles(options.root, { ignoreDirs: options.ignoreDirs, maxEntries: options.maxEntries }))
    }, [reload])

    const selected = entries?.[cursor]
    React.useEffect(() => {
      setPreviewScroll(0)
    }, [selected?.rel])
    React.useEffect(() => {
      if (selected === undefined) {
        setPreview(undefined)
        return
      }
      setPreview(readPreview(`${options.root}/${selected.rel}`, selected.dir, {
        maxBytes: options.previewMaxBytes,
        maxLines: options.previewMaxLines,
      }))
    }, [selected?.rel, reload])

    const listRows = Math.max(3, rows - 3)
    const maxCursor = Math.max(0, (entries?.length ?? 0) - 1)
    let listStart = 0
    if (cursor >= listRows) listStart = cursor - listRows + 1
    const visible = entries?.slice(listStart, listStart + listRows) ?? []
    const previewRows = Math.max(3, rows - 3)
    const maxPreviewScroll = preview?.kind === 'text' ? Math.max(0, preview.lines.length - previewRows) : 0
    const clampedPreviewScroll = Math.min(previewScroll, maxPreviewScroll)

    useInput((input, key) => {
      if (key.escape || input === 'q') return close()
      if (input === 'r') return setReload(value => value + 1)
      // Tree navigation: arrows for everyone, hjkl for vim muscle memory -
      // the tree pane has no text input, so the two vocabularies never
      // collide.
      if (key.upArrow || input === 'k') return setCursor(value => Math.max(0, value - 1))
      if (key.downArrow || input === 'j') return setCursor(value => Math.min(maxCursor, value + 1))
      if (key.pageUp) return setCursor(value => Math.max(0, value - listRows))
      if (key.pageDown) return setCursor(value => Math.min(maxCursor, value + listRows))
      if (input === 'g') return setCursor(0)
      if (input === 'G') return setCursor(maxCursor)
      // Preview scrolling keeps the focus in the tree (remote control).
      if (key.wheelUp) return setPreviewScroll(value => Math.max(0, value - 3))
      if (key.wheelDown) return setPreviewScroll(value => Math.min(maxPreviewScroll, value + 3))
      if (input === ',') return setPreviewScroll(value => Math.max(0, value - 1))
      if (input === '.') return setPreviewScroll(value => Math.min(maxPreviewScroll, value + 1))
    })

    const h = React.createElement
    const treeWidth = Math.max(20, Math.min(48, Math.floor(columns * 0.38)))

    const title = h(
      Box,
      { width: '100%', height: 1, flexShrink: 0 },
      h(Text, { color: 'claude', bold: true }, '⌂ Files'),
      h(
        Text,
        { color: 'subtle' },
        `  ${options.root.replaceAll('\\', '/')}${entries === undefined ? '  scanning…' : `  ${entries.length} entries`}`,
      ),
    )

    const treeRows = visible.map((entry, index) => {
      const absolute = listStart + index
      const active = absolute === cursor
      const indent = '  '.repeat(entry.depth)
      const glyph = entry.dir ? '▸ ' : '  '
      const label = `${entry.name}${entry.dir ? '/' : ''}`
      return h(
        Box,
        { key: entry.rel, height: 1, flexShrink: 0 },
        h(
          Text,
          {
            color: active ? 'text' : entry.dir ? 'permission' : 'subtle',
            bold: active,
            wrap: 'truncate',
          },
          `${active ? '›' : ' '}${indent}${glyph}${label}`,
        ),
      )
    })

    let previewBody
    if (preview === undefined) {
      previewBody = h(Text, { color: 'subtle' }, entries === undefined ? 'scanning…' : 'select a file')
    } else if (preview.kind === 'dir') {
      previewBody = h(Text, { color: 'subtle' }, 'directory')
    } else if (preview.kind === 'binary') {
      previewBody = h(Text, { color: 'subtle' }, `binary · ${preview.bytes} bytes`)
    } else if (preview.kind === 'tooLarge') {
      previewBody = h(
        Text,
        { color: 'subtle' },
        `file exceeds the ${options.previewMaxBytes} byte preview cap (${preview.bytes} bytes)`,
      )
    } else if (preview.kind === 'error') {
      previewBody = h(Text, { color: 'error', wrap: 'truncate' }, preview.message)
    } else {
      previewBody = preview.lines
        .slice(clampedPreviewScroll, clampedPreviewScroll + previewRows)
        .map((line, index) =>
          h(
            Box,
            { key: clampedPreviewScroll + index, height: 1, flexShrink: 0 },
            h(Text, { wrap: 'truncate' }, line.length === 0 ? ' ' : line),
          ),
        )
    }

    const previewMeta =
      preview?.kind === 'text'
        ? `${preview.bytes} bytes · ${preview.lines.length} lines${preview.truncated ? ' (truncated)' : ''}`
        : selected?.dir === true
          ? 'directory'
          : ''

    const footer = h(
      Box,
      { width: '100%', height: 1, flexShrink: 0 },
      h(
        Text,
        { color: 'subtle', wrap: 'truncate-end' },
        `${selected?.rel ?? ''}${previewMeta === '' ? '' : `  ·  ${previewMeta}`}`,
      ),
    )

    const hintRow = h(
      Box,
      { width: '100%', height: 1, flexShrink: 0 },
      h(
        Text,
        { color: 'subtle', wrap: 'truncate-end' },
        '↑↓/jk 移动 · PgUp/PgDn 翻页 · g/G 首尾 · ,/. 或滚轮滚动预览 · r 重扫 · q/Esc 关闭',
      ),
    )

    return h(
      Box,
      { flexDirection: 'column', width: '100%', height: '100%' },
      title,
      h(
        Box,
        { flexDirection: 'row', flexGrow: 1 },
        h(
          Box,
          { flexDirection: 'column', width: treeWidth, flexShrink: 0 },
          ...treeRows,
        ),
        h(Text, { color: 'subtle' }, '│'),
        h(
          Box,
          { flexDirection: 'column', flexGrow: 1 },
          ...Array.isArray(previewBody) ? previewBody : [previewBody],
        ),
      ),
      footer,
      hintRow,
    )
  }
}
