import type { Context } from '@deepseek-ai/cordis'
import type { CommandInvocation } from '@deepseek-ai/dsh-commands'
import Schema from '@deepseek-ai/schemastery'
import type { TuiSceneRuntime } from '@deepseek-harness-tui/dsh-tui/scenes'
import { createFileBrowserScene } from './scene.js'

export const name = 'dsh-tui-filebrowser'
export const inject = ['commands']

export interface Config {
  root?: string
  ignoreDirs?: string[]
  maxEntries?: number
  previewMaxBytes?: number
  previewMaxLines?: number
}

export const Config: Schema<Config> = Schema.object({
  root: Schema.string().required(false).description('Workspace root to browse; defaults to the process cwd'),
  ignoreDirs: Schema.array(Schema.string()).default(['node_modules', '.git', 'lib', 'dist', 'worktrees', '.pnpm-store']),
  maxEntries: Schema.number().step(1).min(50).max(20000).default(2000),
  previewMaxBytes: Schema.number().step(1).min(1024).default(256 * 1024),
  previewMaxLines: Schema.number().step(1).min(50).default(400),
})

export function apply(ctx: Context, config: Config = {}): void {
  const options = {
    root: config.root ?? process.cwd(),
    ignoreDirs: config.ignoreDirs ?? ['node_modules', '.git', 'lib', 'dist', 'worktrees', '.pnpm-store'],
    maxEntries: config.maxEntries ?? 2000,
    previewMaxBytes: config.previewMaxBytes ?? 256 * 1024,
    previewMaxLines: config.previewMaxLines ?? 400,
  }
  ctx.inject(['tuiScenes'], (sceneCtx) => {
    const scenes = sceneCtx.get('tuiScenes') as TuiSceneRuntime
    sceneCtx.effect(
      () => scenes.register({
        id: 'file-browser',
        title: 'Files',
        component: createFileBrowserScene(options),
      }),
      'dsh-tui-filebrowser scene',
    )
  })

  ctx.effect(
    () => ctx.commands.register({
      name: 'edit',
      description: 'Open the workspace file browser (read-only snapshot viewer)',
      recordInput: false,
      handler: ({ rawInput }: CommandInvocation) => {
        if (rawInput.trim().length > 0) return { kind: 'error', text: 'Usage: /edit' }
        const scenes = ctx.get('tuiScenes') as TuiSceneRuntime | undefined
        if (scenes?.open('file-browser') !== true) {
          return { kind: 'error', text: 'File browser is unavailable on this host' }
        }
        return { kind: 'success' }
      },
    }),
    'dsh-tui-filebrowser command',
  )
}
