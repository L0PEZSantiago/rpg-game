const { app, BrowserWindow, net, protocol } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const APP_SCHEME = 'app'
const APP_HOST = 'rpg'
const APP_ENTRY_URL = `${APP_SCHEME}://${APP_HOST}/index.html`

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
])

let protocolRegistered = false

function isSafePath(root, candidate) {
  const rootPath = path.resolve(root)
  const candidatePath = path.resolve(candidate)
  return candidatePath.startsWith(rootPath)
}

function resolveAssetPath(rootDir, urlPath) {
  const decodedPath = decodeURIComponent(urlPath || '/')
  const requestPath = decodedPath === '/' ? '/index.html' : decodedPath
  const normalizedPath = path.normalize(requestPath).replace(/^(\.\.(\/|\\|$))+/, '')
  let filePath = path.join(rootDir, normalizedPath)

  if (!isSafePath(rootDir, filePath)) {
    return path.join(rootDir, 'index.html')
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(rootDir, 'index.html')
  }

  return filePath
}

function registerAppProtocol() {
  if (protocolRegistered) {
    return
  }
  const distDir = path.join(__dirname, '..', 'dist')
  protocol.handle(APP_SCHEME, (request) => {
    const requestUrl = new URL(request.url)
    const filePath = resolveAssetPath(distDir, requestUrl.pathname)
    return net.fetch(pathToFileURL(filePath).toString())
  })
  protocolRegistered = true
}

async function createMainWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 860,
    minWidth: 1120,
    minHeight: 720,
    autoHideMenuBar: true,
    backgroundColor: '#081118',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  if (devServerUrl) {
    await window.loadURL(devServerUrl)
    return
  }

  registerAppProtocol()
  await window.loadURL(APP_ENTRY_URL)
}

app.whenReady().then(() => createMainWindow()).catch((error) => {
  console.error(error)
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow().catch(console.error)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
