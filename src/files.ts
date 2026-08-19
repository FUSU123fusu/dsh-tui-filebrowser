import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** One row of the flat, depth-indented listing the tree pane shows. */
export interface FileEntry {
  /** Path relative to the browser root, always forward slashes. */
  rel: string
  name: string
  depth: number
  dir: boolean
  bytes: number
}

export interface WalkOptions {
  ignoreDirs: readonly string[]
  maxEntries: number
}

/**
 * Breadth-friendly recursive walk: directories first at each level, entries
 * capped at `maxEntries` so a monorepo cannot stall the scene on open. The
 * walk is a SNAPSHOT - it never watches; `r` re-runs it.
 */
export function walkFiles(root: string, options: WalkOptions): FileEntry[] {
  const out: FileEntry[] = []
  const ignore = new Set(options.ignoreDirs)
  const queue: Array<{ dir: string; depth: number }> = [{ dir: root, depth: 0 }]
  while (queue.length > 0 && out.length < options.maxEntries) {
    const { dir, depth } = queue.shift()!
    let names: string[]
    try {
      names = readdirSync(dir)
    } catch {
      continue
    }
    const dirs: string[] = []
    const files: string[] = []
    for (const name of names) {
      if (ignore.has(name)) continue
      let isDir = false
      let bytes = 0
      try {
        const info = statSync(join(dir, name))
        isDir = info.isDirectory()
        bytes = info.size
      } catch {
        continue
      }
      if (isDir) dirs.push(name)
      else files.push(name)
    }
    dirs.sort((a, b) => a.localeCompare(b))
    files.sort((a, b) => a.localeCompare(b))
    const relOf = (name: string): string =>
      (dir === root ? name : `${dir.slice(root.length + 1).replaceAll('\\', '/')}/${name}`)
    for (const name of [...dirs, ...files]) {
      if (out.length >= options.maxEntries) break
      let isDir = false
      let bytes = 0
      try {
        const info = statSync(join(dir, name))
        isDir = info.isDirectory()
        bytes = info.size
      } catch {
        continue
      }
      out.push({ rel: relOf(name), name, depth, dir: isDir, bytes })
      if (isDir) queue.push({ dir: join(dir, name), depth: depth + 1 })
    }
  }
  return out
}

export type Preview =
  | { kind: 'dir'; note: string }
  | { kind: 'text'; lines: string[]; truncated: boolean; bytes: number }
  | { kind: 'binary'; bytes: number }
  | { kind: 'tooLarge'; bytes: number }
  | { kind: 'error'; message: string }

export interface PreviewLimits {
  maxBytes: number
  maxLines: number
}

/** Read-once snapshot of one file for the preview pane. */
export function readPreview(absPath: string, dir: boolean, limits: PreviewLimits): Preview {
  if (dir) return { kind: 'dir', note: 'directory' }
  let raw: Buffer
  try {
    raw = readFileSync(absPath)
  } catch (error) {
    return { kind: 'error', message: error instanceof Error ? error.message : String(error) }
  }
  if (raw.length > limits.maxBytes) return { kind: 'tooLarge', bytes: raw.length }
  if (raw.includes(0)) return { kind: 'binary', bytes: raw.length }
  const allLines = raw.toString('utf8').replaceAll('\r\n', '\n').split('\n')
  const truncated = allLines.length > limits.maxLines
  const lines = truncated ? allLines.slice(0, limits.maxLines) : allLines
  return { kind: 'text', lines, truncated, bytes: raw.length }
}
