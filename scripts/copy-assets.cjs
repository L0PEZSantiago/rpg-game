const fs = require('node:fs')
const path = require('node:path')

const root = process.cwd()
const srcAssetsDir = path.join(root, 'assets')
const distAssetsDir = path.join(root, 'dist', 'assets')

if (!fs.existsSync(srcAssetsDir)) {
  console.log('[copy-assets] source assets directory not found, skipping.')
  process.exit(0)
}

fs.mkdirSync(distAssetsDir, { recursive: true })
fs.cpSync(srcAssetsDir, distAssetsDir, { recursive: true, force: true })
console.log('[copy-assets] copied assets -> dist/assets')
