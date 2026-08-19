# spec-pin —— 固定的生态规范校验资产

本目录固化 manifest 校验所需的规范资产，使仓库可以独立构建/校验（不联网、不依赖相邻目录的规范检出）。内容来源于：

- `dsh-plugin-0.15.schema.json` —— `T-Auto/dsh-ecosystem-spec` 的 `vendor/dsh-std`（Yan-Zero/dsh-std）submodule，pin 在 `614dfa1`（`packages/manifest/schema/`）
- `registry-0.15.json`、`permissions-0.1.json` —— `T-Auto/dsh-ecosystem-spec` 的 `registry/`，拷贝时规范仓库 HEAD 为 `d41ab90`

校验脚本 `scripts/validate-manifest.mjs` 优先使用本目录；若设置环境变量 `DSH_ECOSYSTEM_SPEC` 指向规范仓库检出，则改用该检出（便于在新规范版本下重新校验）。

更新方式：从上游规范仓库拷贝同名文件覆盖，并更新本 README 中的 pin 记录。
