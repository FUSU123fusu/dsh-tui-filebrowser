# dsh-tui-filebrowser

dsh-TUI 全屏文件浏览场景：左侧文件树（快照），右侧只读预览，`/edit` 打开。纯只读——插件不执行任何文件写入。推荐在https://github.com/ccch1mneyyy/dsh-TUI使用。

## 浏览

- 单焦点模型：焦点常驻文件树，预览跟随选择（ranger 式），滚轮/`,`/`.` 遥控滚动预览
- 键位：`↑↓`/`jk` 移动、`PgUp/PgDn` 翻页、`g`/`G` 首尾、`r` 重扫、`q`/`Esc` 关闭
- 忽略目录可配（默认 node_modules/.git/lib/dist/worktrees 等）
- 快照式读取：选中时读一次，不监听文件变化，`r` 显式重扫

## 配置

| 键 | 默认 | 说明 |
| --- | --- | --- |
| `root` | 进程 cwd | 浏览的根目录 |
| `ignoreDirs` | node_modules 等 | 忽略的目录名 |
| `maxEntries` | 2000 | 树扫描上限 |
| `previewMaxBytes` / `previewMaxLines` | 256 KiB / 400 | 预览上限 |

## 安装

```bash
# 从 GitHub Release 下载 tarball 后：
dsh plugin --profile dsh-tui add dsh-tui-filebrowser-<version>.tgz

# 或从源码构建：
pnpm install && npm run verify && npm pack
dsh plugin --profile dsh-tui add dsh-tui-filebrowser-<version>.tgz
```

开发：`npm run verify`（构建 + manifest 校验，按 dsh-ecosystem-spec Community v0.15 / PLUGIN-ADMISSION-CHECKLIST 校验 dsh-plugin.json；校验资产固定在 `spec-pin/`，不联网可跑）。
