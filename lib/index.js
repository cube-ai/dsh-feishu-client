/**
 * dsh-feishu-client Host。
 *
 * 简化为：一个飞书机器人应用 = 一个机器人 = 一个单聊（app.chatId）。
 * - apps.json：应用凭据（SecretRef）、用户 OAuth Token、单聊 chatId、授权状态。
 * - 旧 apps.json + chats.json 会自动合并；群聊等扩展以后再引入会话列表。
 *
 * 发送用 user_access_token（以用户本人身份），读取用 tenant_access_token。
 * 首次绑定单聊时，通过 user_info + 机器人给用户发设置消息拿到 p2p chat_id。
 */
import { appendFileSync, chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { randomBytes, randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import { createServer } from 'node:http'
import { AgentBridge, localFeishuChannelsAppIds as readLocalFeishuChannelsAppIds, normalizeTags } from './agent-bridge.js'

export const name = 'dsh-feishu-client'
export const inject = ['webServer', 'credentials']

// 保留旧协议路径：远端 dsh-feishu-channels 扫码时会自动写入该 OAuth 回调地址。
const API_BASE = '/api/dsh-feishu-client'
const OPEN_BASE = 'https://open.feishu.cn'
const ACCOUNTS_BASE = 'https://accounts.feishu.cn'
const SCOPES = ['im:message', 'im:message.send_as_user', 'offline_access']
const MAX_BODY_BYTES = 1024 * 1024
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024
const STATE_TTL_MS = 10 * 60_000
const REF_PREFIX = 'dsh_feishu_client'

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message)
    this.status = status
    this.feishuCode = extra.feishuCode
  }
}

function nowIso() {
  return new Date().toISOString()
}

function asString(value) {
  return typeof value === 'string' ? value : ''
}

export function normalizeBaseUrl(value) {
  const raw = asString(value).trim()
  if (!raw) return ''
  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    throw new HttpError(400, '访问地址无效')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new HttpError(400, '访问地址必须是 http(s)')
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new HttpError(400, '访问地址不能包含用户信息、查询参数或片段')
  }
  const pathname = parsed.pathname.replace(/\/+$/, '')
  return `${parsed.origin}${pathname}`
}

export function isDesktopBase(value) {
  return /^dsh-app:\/\//i.test(asString(value).trim())
}

function baseFromReferer(req) {
  const raw = asString(req?.headers?.referer ?? req?.headers?.referrer).trim()
  if (!raw) return ''
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    const pathname = url.pathname.replace(/\/+$/, '')
    return `${url.origin}${pathname}`
  } catch {
    return ''
  }
}

function parseJson(value, fallback = {}) {
  if (value && typeof value === 'object') return value
  if (typeof value !== 'string' || value.trim() === '') return fallback
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : fallback
  } catch {
    return fallback
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function readLimited(req, maxBytes, message = '请求体超过上限') {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let done = false
    const fail = (error) => {
      if (done) return
      done = true
      reject(error)
    }
    const declared = Number(req.headers['content-length'])
    if (Number.isFinite(declared) && declared > maxBytes) {
      fail(new HttpError(413, message))
      req.resume()
      return
    }
    req.on('data', (chunk) => {
      if (done) return
      size += chunk.length
      if (size > maxBytes) {
        fail(new HttpError(413, message))
        req.resume()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (done) return
      done = true
      resolve(Buffer.concat(chunks))
    })
    req.on('error', (error) => fail(error))
  })
}

function readBody(req) {
  return readLimited(req, MAX_BODY_BYTES, '请求体超过 1MB 上限').then((buffer) => buffer.toString('utf8'))
}

function readRaw(req, maxBytes) {
  return readLimited(req, maxBytes, '附件超过大小上限')
}

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'tiff', 'heic', 'svg'])
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'opus', 'm4a', 'aac', 'flac', 'amr', 'wma'])
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v', 'flv', 'wmv'])

function fileExtension(name) {
  const value = String(name ?? '').trim().toLowerCase()
  const index = value.lastIndexOf('.')
  if (index < 0 || index === value.length - 1) return ''
  return value.slice(index + 1, index + 9).replace(/[^a-z0-9]/g, '')
}

function mediaKindFromName(name) {
  const ext = fileExtension(name)
  if (IMAGE_EXTENSIONS.has(ext)) return 'image'
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio'
  if (VIDEO_EXTENSIONS.has(ext)) return 'video'
  return 'file'
}

function sanitizeFileName(value) {
  const name = String(value ?? '').replace(/[\/\\\u0000-\u001f\u007f]/g, '_').replace(/\s+/g, ' ').trim()
  return (name || 'file').slice(0, 180)
}

function postText(content) {
  const post = content?.content
    ? content
    : content?.zh_cn ?? content?.en_us ?? Object.values(content ?? {})[0]
  if (!post || !Array.isArray(post.content)) return ''
  const lines = []
  if (typeof post.title === 'string' && post.title.trim()) lines.push(post.title.trim())
  for (const row of post.content) {
    if (!Array.isArray(row)) continue
    const parts = []
    for (const item of row) {
      if (!item || typeof item !== 'object') continue
      if (item.tag === 'text' && typeof item.text === 'string') parts.push(item.text)
      else if (item.tag === 'a' && typeof item.text === 'string') parts.push(item.text)
      else if (item.tag === 'at') parts.push(`@${item.user_name ?? item.user_id ?? ''}`)
      else if (item.tag === 'img') parts.push('[图片]')
    }
    if (parts.length) lines.push(parts.join(''))
  }
  return lines.join('\n')
}

function walkCard(element, out) {
  if (!element) return
  if (Array.isArray(element)) {
    for (const item of element) walkCard(item, out)
    return
  }
  if (typeof element !== 'object') return
  if (element.tag === 'markdown' && typeof element.content === 'string') {
    out.push(element.content)
    return
  }
  if (element.tag === 'div') {
    const text = element.text?.content ?? element.text?.text
    if (typeof text === 'string') out.push(text)
  }
  if (element.tag === 'action' || element.tag === 'button') return
  if (element.tag === 'img') out.push('[图片]')
  for (const key of ['elements', 'columns', 'fields']) {
    if (Array.isArray(element[key])) for (const child of element[key]) walkCard(child, out)
  }
}

function cardText(card) {
  if (!card || typeof card !== 'object') return '[卡片消息]'
  const parts = []
  const title = card.header?.title?.content ?? card.header?.title?.text
  if (typeof title === 'string' && title.trim()) parts.push(title.trim())
  const elements = card.body?.elements ?? card.elements ?? []
  walkCard(elements, parts)
  const text = parts.join('\n').trim()
  return text || '[卡片消息]'
}

function cardActionText(label, index, messageText) {
  const text = String(label ?? '').trim()
  const approval = /需要你的审批|请精准回复「批准」|批准一次|工具调用审批/.test(messageText)
    && !/已失效|已结束/.test(messageText)
  if (approval) {
    if (/批准|同意|allow|^yes$|^y$/i.test(text)) return '批准'
    if (/拒绝|不同意|reject|deny|^no$|^n$/i.test(text)) return '拒绝'
  }
  return String(index + 1)
}

function cardActions(card, messageText = '') {
  if (!card || typeof card !== 'object') return []
  const out = []
  let choice = 0
  const walk = (element) => {
    if (!element) return
    if (Array.isArray(element)) { for (const item of element) walk(item); return }
    if (typeof element !== 'object') return
    if (element.tag === 'action') {
      if (Array.isArray(element.actions)) for (const action of element.actions) walk(action)
      return
    }
    if (element.tag === 'button') {
      const label = element.text?.content
      if (typeof label === 'string' && label.trim()) {
        const token = element.value?.token
        if (typeof token === 'string' && token) {
          const index = choice
          choice += 1
          out.push({ label: label.trim(), index, text: cardActionText(label, index, messageText) })
        } else {
          const url = element.behaviors?.find?.((item) => item?.type === 'open_url')?.default_url ?? element.url
          if (typeof url === 'string' && /^https?:\/\//.test(url)) out.push({ label: label.trim(), url })
        }
      }
      return
    }
    for (const key of ['elements', 'columns', 'fields']) {
      if (Array.isArray(element[key])) for (const child of element[key]) walk(child)
    }
  }
  walk(card.body?.elements ?? card.elements ?? [])
  if (!out.length
    && /需要你的审批|请精准回复「批准」|批准一次|工具调用审批/.test(messageText)
    && !/已失效|已结束/.test(messageText)) {
    out.push({ label: '批准', index: 0, text: '批准' }, { label: '拒绝', index: 1, text: '拒绝' })
  }
  return out.slice(0, 20)
}

function cardChoices(card) {
  if (!card || typeof card !== 'object') return []
  const out = []
  const walk = (element) => {
    if (!element) return
    if (Array.isArray(element)) { for (const item of element) walk(item); return }
    if (typeof element !== 'object') return
    if (element.tag === 'action') {
      if (Array.isArray(element.actions)) for (const action of element.actions) walk(action)
      return
    }
    if (element.tag === 'button') {
      const label = element.text?.content
      if (typeof label === 'string' && label.trim()) out.push(label.trim())
      return
    }
    for (const key of ['elements', 'columns', 'fields']) {
      if (Array.isArray(element[key])) for (const child of element[key]) walk(child)
    }
  }
  walk(card.body?.elements ?? card.elements ?? [])
  return out.slice(0, 10)
}

function friendlyFeishuError(code, message) {
  const map = {
    10001: 'App ID 或 App Secret 无效',
    10003: 'App ID 或 App Secret 无效',
    10014: 'App ID 或 App Secret 无效',
    20010: '当前用户不在应用可用范围内',
    20027: '应用未开通 OAuth 请求中的权限，请先在开发者后台开通',
    230002: '机器人不在该聊天中，请确认 Chat ID',
    230027: '应用缺少所需权限，请检查 im:message / im:message:send_as_bot',
    230034: 'Chat ID 无效',
    230020: '飞书限流，请稍后重试',
    11232: '飞书限流，请稍后重试',
    99991400: '飞书限流，请稍后重试',
    99991677: '用户授权已过期，请重新授权',
    99991668: '用户授权已过期，请重新授权',
    99991679: '用户授权缺少所需权限（im:message.send_as_user），请重新授权',
    234004: '机器人不在该会话中，无法读取资源',
    234003: '资源不属于这条消息',
    234006: '附件超过飞书大小限制（图片 10MB / 文件 30MB）',
    234007: '应用未开启机器人能力',
    234010: '不能上传空文件',
    234011: '图片格式不支持',
    234038: '该消息处于保密模式，不能下载资源',
    234039: '图片分辨率超过飞书限制',
    234043: '该消息类型暂不支持读取资源',
  }
  const numeric = Number(code)
  if (map[numeric]) return map[numeric]
  const suffix = typeof message === 'string' && message.trim() ? `（${message.trim()}）` : ''
  return `飞书接口返回错误 ${code ?? ''}${suffix}`.trim()
}

class FeishuClient {
  constructor(ctx, config) {
    this.ctx = ctx
    this.config = config ?? {}
    this.log = ctx.logger(name)
    const configured = asString(this.config.stateDir).trim()
    // 保留旧状态目录，已有凭据、授权和 chatId 无需迁移。
    const stateDirName = 'dsh-feishu-client'
    this.stateDir = configured || join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), stateDirName)
    mkdirSync(this.stateDir, { recursive: true, mode: 0o700 })
    try { chmodSync(this.stateDir, 0o700) } catch {}
    this.appsFile = join(this.stateDir, 'apps.json')
    this.legacyChatsFile = join(this.stateDir, 'chats.json')
    this.legacyBotsFile = join(this.stateDir, 'bots.json')
    this.debugFile = join(this.stateDir, 'debug.log')
    this.repairedRefs = false
    this.state = this.loadState()
    if (this.repairedRefs) this.flush()
    this.tenantTokens = new Map()
    this.oauthStates = new Map()
    this.desktopCallbackServer = null
    this.desktopCallbackBase = ''
    this.desktopCallbackPromise = null
  }

  start() {
    this.debug('[boot] host plugin start')
    const dispose = this.ctx.webServer.register({
      kind: 'prefix',
      path: API_BASE,
      handler: (req, res) => { void this.handle(req, res) },
    })
    let disposeBase = () => {}
    try {
      const configuredBase = normalizeBaseUrl(this.config.publicBaseUrl)
      if (configuredBase && typeof this.ctx.webServer.tapIndex === 'function') {
        const payload = JSON.stringify(configuredBase)
        const script = `<script>window.__DSH_FEISHU_CLIENT_BASE__=${payload}</script>`
        disposeBase = this.ctx.webServer.tapIndex((html) => {
          if (typeof html !== 'string' || html.includes('__DSH_FEISHU_CLIENT_BASE__')) return html
          return html.includes('</head>') ? html.replace('</head>', `${script}</head>`) : `${script}${html}`
        })
        this.debug(`[boot] client base injected ${configuredBase}`)
      }
    } catch (error) {
      this.debug(`[boot] publicBaseUrl invalid: ${error instanceof Error ? error.message : String(error)}`)
    }
    this.log.info(`[boot] API 已注册 ${API_BASE}`)
    this.debug(`[boot] api registered ${API_BASE} apps=${this.state.apps.length}`)
    return () => {
      dispose()
      disposeBase()
      this.closeDesktopCallback()
      this.oauthStates.clear()
      this.tenantTokens.clear()
    }
  }

  debug(line) {
    try {
      appendFileSync(this.debugFile, `${new Date().toISOString()} ${line}\n`, { mode: 0o600 })
      chmodSync(this.debugFile, 0o600)
    } catch {}
  }

  readJsonFile(file) {
    try {
      const raw = readFileSync(file, 'utf8')
      const data = JSON.parse(raw)
      return data && typeof data === 'object' ? data : null
    } catch (error) {
      if (error?.code === 'ENOENT') return null
      const backup = `${file}.corrupt-${Date.now()}`
      try { renameSync(file, backup) } catch {}
      this.debug(`[store] 无法读取 ${file}，已备份到 ${backup}`)
      return null
    }
  }

  loadState() {
    const appData = this.readJsonFile(this.appsFile)
    if (appData && Array.isArray(appData.apps)) {
      const currentVersion = Number(appData.version) || 2
      const apps = appData.apps
        .filter((app) => app && typeof app.id === 'string' && typeof app.appId === 'string')
        .map((app) => {
          if (!app.chatId) app.chatId = ''
          if (typeof app.description !== 'string') app.description = ''
          app.description = app.description.slice(0, 500)
          app.tags = normalizeTags(app.tags)
          if (!app.lastAsk || typeof app.lastAsk !== 'object') app.lastAsk = null
          for (const key of ['userAccessTokenRef', 'refreshTokenRef']) {
            if (typeof app[key] === 'string' && app[key].includes('_bot_bot_')) {
              app[key] = app[key].replace('_bot_bot_', '_bot_')
              this.repairedRefs = true
            }
          }
          return app
        })
      let mergedChats = false
      const chatData = this.readJsonFile(this.legacyChatsFile)
      if (chatData && Array.isArray(chatData.chats)) {
        for (const app of apps) {
          if (app.chatId) continue
          const chat = chatData.chats.find((item) => item?.appRef === app.id && typeof item.chatId === 'string')
          if (chat) {
            app.chatId = chat.chatId
            mergedChats = true
          }
        }
        const backup = `${this.legacyChatsFile}.migrated-${Date.now()}`
        try { renameSync(this.legacyChatsFile, backup) } catch {}
        this.debug(`[store] 已把 chats.json 合并进 apps.json（备份 ${backup}）`)
      }
      if (currentVersion < 3) {
        const backup = `${this.appsFile}.v${currentVersion}-${Date.now()}`
        try { renameSync(this.appsFile, backup) } catch {}
        this.debug(`[store] 已把 apps.json v${currentVersion} 迁移到 v3（备份 ${backup}）`)
      }
      if (currentVersion < 3 || mergedChats) this.writeState({ apps })
      return { apps }
    }
    const legacy = this.readJsonFile(this.legacyBotsFile)
    if (legacy && Array.isArray(legacy.bots) && legacy.bots.length > 0) {
      const apps = this.migrateLegacy(legacy.bots)
      this.writeState({ apps })
      const backup = `${this.legacyBotsFile}.migrated-${Date.now()}`
      try { renameSync(this.legacyBotsFile, backup) } catch {}
      this.debug(`[store] 已迁移 bots.json -> apps.json（备份 ${backup}）`)
      return { apps }
    }
    return { apps: [] }
  }

  migrateLegacy(bots) {
    const apps = []
    for (const bot of bots) {
      if (!bot || typeof bot.appId !== 'string' || typeof bot.chatId !== 'string') continue
      let app = apps.find((item) => item.appId === bot.appId)
      if (!app) {
        app = {
          id: `app_${randomBytes(6).toString('hex')}`,
          name: asString(bot.name).trim() || '飞书机器人应用',
          appId: bot.appId,
          appSecretRef: asString(bot.appSecretRef) || this.refLegacy(bot.id, 'app_secret'),
          userAccessTokenRef: this.refLegacy(bot.id, 'user_access_token'),
          refreshTokenRef: this.refLegacy(bot.id, 'refresh_token'),
          chatId: bot.chatId,
          auth: bot.auth ?? { authorized: false },
          createdAt: bot.createdAt ?? nowIso(),
          updatedAt: bot.updatedAt ?? nowIso(),
          migratedFrom: bot.id,
        }
        apps.push(app)
      } else if (!app.chatId) {
        app.chatId = bot.chatId
      }
    }
    return apps
  }

  writeState(state) {
    const file = this.appsFile
    const temp = `${file}.tmp-${process.pid}-${Date.now()}`
    writeFileSync(temp, `${JSON.stringify({ version: 3, apps: state.apps }, null, 2)}\n`, { mode: 0o600 })
    renameSync(temp, file)
    try { chmodSync(file, 0o600) } catch {}
  }

  flush() {
    this.writeState(this.state)
  }

  ref(id, key) {
    return `${REF_PREFIX}_${id}_${key}`.replace(/[^A-Za-z0-9_]/g, '_')
  }

  refLegacy(botId, key) {
    const id = String(botId ?? '').startsWith('bot_') ? String(botId) : `bot_${botId}`
    return `${REF_PREFIX}_${id}_${key}`.replace(/[^A-Za-z0-9_]/g, '_')
  }

  ensureAppRefs(app) {
    if (!app.appSecretRef) app.appSecretRef = this.ref(app.id, 'app_secret')
    if (!app.userAccessTokenRef) app.userAccessTokenRef = this.ref(app.id, 'user_access_token')
    if (!app.refreshTokenRef) app.refreshTokenRef = this.ref(app.id, 'refresh_token')
  }

  async vaultSet(ref, value) {
    await this.ctx.credentials.set(ref, value)
  }

  async vaultGet(ref) {
    const result = await this.ctx.credentials.resolve(ref)
    if (typeof result === 'string') return result
    return result?.value
  }

  async vaultUnset(ref) {
    await this.ctx.credentials.unset(ref)
  }

  appById(id) {
    const app = this.state.apps.find((item) => item.id === id)
    if (!app) throw new HttpError(404, '机器人不存在')
    return app
  }

  authView(app) {
    const auth = app.auth ?? {}
    return {
      authorized: Boolean(auth.authorized),
      expiresAt: auth.expiresAt ?? null,
      scope: auth.scope ?? '',
      refreshable: Boolean(auth.refreshable),
      warning: auth.warning ?? null,
      error: auth.error ?? null,
    }
  }

  viewApp(app) {
    return {
      id: app.id,
      name: app.name,
      appId: app.appId,
      chatId: app.chatId ?? '',
      description: app.description ?? '',
      tags: Array.isArray(app.tags) ? app.tags : [],
      lastAsk: app.lastAsk ?? null,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      auth: this.authView(app),
    }
  }

  stateView() {
    return { apps: this.state.apps.map((app) => this.viewApp(app)) }
  }

  async createApp(body) {
    const appId = asString(body?.appId).trim()
    const appSecret = asString(body?.appSecret).trim()
    const name = asString(body?.name).trim().slice(0, 60) || `飞书机器人 ${this.state.apps.length + 1}`
    const description = asString(body?.description).trim().slice(0, 500)
    const tags = normalizeTags(body?.tags)
    if (!appId || !appSecret) throw new HttpError(400, '请填写 App ID 和 App Secret')
    if (this.state.apps.some((app) => app.appId === appId)) {
      throw new HttpError(400, '这个应用已经添加过，请使用“使用已有应用”。')
    }
    const app = {
      id: `app_${randomBytes(6).toString('hex')}`,
      name,
      appId,
      appSecretRef: '',
      userAccessTokenRef: '',
      refreshTokenRef: '',
      chatId: '',
      auth: { authorized: false },
      description,
      tags,
      lastAsk: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    this.ensureAppRefs(app)
    await this.vaultSet(app.appSecretRef, appSecret)
    this.state.apps.unshift(app)
    try {
      this.flush()
    } catch (error) {
      this.state.apps = this.state.apps.filter((item) => item.id !== app.id)
      await this.vaultUnset(app.appSecretRef).catch(() => undefined)
      throw error
    }
    this.debug(`[app] created ${app.id}`)
    return this.viewApp(app)
  }

  async updateApp(id, body) {
    const app = this.appById(id)
    const patch = {}
    if (body?.name !== undefined) {
      const name = asString(body.name).trim().slice(0, 60)
      if (!name) throw new HttpError(400, '名称不能为空')
      patch.name = name
    }
    if (body?.description !== undefined) {
      patch.description = asString(body.description).trim().slice(0, 500)
    }
    if (body?.tags !== undefined) {
      patch.tags = normalizeTags(body.tags)
    }
    if (!Object.keys(patch).length) throw new HttpError(400, '没有要更新的字段')
    Object.assign(app, patch)
    app.updatedAt = nowIso()
    this.flush()
    this.debug(`[app] updated ${id}`)
    return this.viewApp(app)
  }

  async renameApp(id, body) {
    return this.updateApp(id, { name: body?.name })
  }

  async deleteApp(id) {
    const app = this.appById(id)
    this.state.apps = this.state.apps.filter((item) => item.id !== id)
    this.flush()
    for (const ref of [app.appSecretRef, app.userAccessTokenRef, app.refreshTokenRef]) {
      if (ref) await this.vaultUnset(ref).catch(() => undefined)
    }
    this.tenantTokens.delete(id)
    this.debug(`[app] deleted ${id}`)
  }

  async appSecret(app) {
    this.ensureAppRefs(app)
    const value = await this.vaultGet(app.appSecretRef)
    if (!value) throw new HttpError(400, 'App Secret 未保存，请重新添加应用')
    return value
  }

  async tenantToken(app) {
    const cached = this.tenantTokens.get(app.id)
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token
    const secret = await this.appSecret(app)
    const data = await this.postJson(`${OPEN_BASE}/open-apis/auth/v3/tenant_access_token/internal`, {
      app_id: app.appId,
      app_secret: secret,
    })
    if (Number(data?.code) !== 0 || !data?.tenant_access_token) {
      throw new HttpError(502, friendlyFeishuError(data?.code ?? 'unknown', data?.msg), { feishuCode: data?.code })
    }
    const expiresAt = Date.now() + (Number(data.expire) || 7200) * 1000
    this.tenantTokens.set(app.id, { token: data.tenant_access_token, expiresAt })
    return data.tenant_access_token
  }

  async postJson(url, body) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
      redirect: 'error',
    })
    const text = await response.text()
    try { return JSON.parse(text) } catch { return { code: 'invalid-json', msg: `HTTP ${response.status}` } }
  }

  async feishu(token, path, options = {}) {
    const method = options.method ?? 'GET'
    const headers = { authorization: `Bearer ${token}` }
    if (options.body !== undefined) headers['content-type'] = 'application/json; charset=utf-8'
    const response = await fetch(`${OPEN_BASE}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(15_000),
      redirect: 'error',
    })
    const text = await response.text()
    let data = {}
    try { data = JSON.parse(text) } catch {}
    if (!response.ok && data?.code === undefined) {
      throw new HttpError(502, `飞书接口 HTTP ${response.status}`, { feishuCode: response.status })
    }
    if (data?.code !== undefined && Number(data.code) !== 0) {
      throw new HttpError(502, friendlyFeishuError(data.code, data.msg), { feishuCode: data.code })
    }
    return data?.data ?? {}
  }

  async botInfo(app) {
    const token = await this.tenantToken(app)
    const data = await this.feishu(token, '/open-apis/bot/v3/info')
    return data?.bot ?? {}
  }

  async listRawPage(app, options = {}) {
    const token = await this.tenantToken(app)
    const pageSize = Math.min(Math.max(Number(options.pageSize) || 50, 1), 50)
    const query = new URLSearchParams({
      container_id_type: 'chat',
      container_id: app.chatId,
      sort_type: 'ByCreateTimeDesc',
      page_size: String(pageSize),
      card_msg_content_type: 'user_card_content',
    })
    const pageToken = asString(options.pageToken)
    if (pageToken) query.set('page_token', pageToken)
    const data = await this.feishu(token, `/open-apis/im/v1/messages?${query.toString()}`)
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      hasMore: Boolean(data?.has_more),
      pageToken: asString(data?.page_token),
    }
  }

  async listRaw(app, pageSize = 50) {
    const page = await this.listRawPage(app, { pageSize })
    return page.items
  }

  async messageCreatedAt(app, messageId) {
    const token = await this.tenantToken(app)
    const data = await this.feishu(token, `/open-apis/im/v1/messages/${encodeURIComponent(messageId)}`)
    const item = Array.isArray(data?.items) ? data.items[0] : data
    return Number(item?.create_time) || 0
  }

  async listSince(app, since, maxPages = 3) {
    const items = []
    let pageToken = ''
    for (let page = 0; page < Math.max(1, maxPages); page += 1) {
      const result = await this.listRawPage(app, { pageSize: 50, pageToken })
      for (const item of result.items) {
        const createdAt = Number(item?.create_time) || 0
        if (since && createdAt <= since) {
          return this.normalizeItems(items, app, since)
        }
        items.push(item)
      }
      if (!result.hasMore || !result.pageToken) break
      pageToken = result.pageToken
    }
    return this.normalizeItems(items, app, since)
  }

  normalizeItems(items, app, since) {
    return items
      .map((item) => this.normalize(item, app))
      .filter(Boolean)
      .filter((message) => !since || message.createdAt > since)
      .sort((left, right) => left.createdAt - right.createdAt)
  }

  async testApp(id) {
    const app = this.appById(id)
    this.debug(`[test] ${app.id}`)
    const info = await this.botInfo(app)
    const access = await this.vaultGet(app.userAccessTokenRef)
    return {
      bot: { name: info?.app_name ?? info?.name ?? '', openId: info?.open_id ?? '' },
      authorized: Boolean(access) && app.auth?.authorized !== false,
      chatBound: Boolean(app.chatId),
    }
  }

  async userToken(app) {
    this.ensureAppRefs(app)
    const access = await this.vaultGet(app.userAccessTokenRef)
    const expiresAt = Date.parse(app.auth?.expiresAt ?? '') || 0
    if (access && (!expiresAt || expiresAt > Date.now() + 120_000)) return access
    if (app.auth?.refreshable) {
      try {
        return await this.refreshUserToken(app)
      } catch (error) {
        app.auth = { ...(app.auth ?? {}), authorized: false, error: '授权已过期，请重新授权' }
        this.flush()
        throw new HttpError(401, '授权已过期，请重新授权', { feishuCode: error?.feishuCode })
      }
    }
    if (access) return access
    throw new HttpError(401, '尚未授权飞书用户，请先完成授权')
  }

  async refreshUserToken(app) {
    const refreshToken = await this.vaultGet(app.refreshTokenRef)
    if (!refreshToken) throw new HttpError(401, '没有 refresh_token，请重新授权')
    const secret = await this.appSecret(app)
    const payload = await this.tokenRequest({
      grant_type: 'refresh_token',
      client_id: app.appId,
      client_secret: secret,
      refresh_token: refreshToken,
    })
    await this.saveTokens(app, payload)
    return payload.access_token
  }

  async tokenRequest(body) {
    const endpoints = [
      `${ACCOUNTS_BASE}/oauth/v3/token`,
      `${OPEN_BASE}/open-apis/authen/v2/oauth/token`,
    ]
    let last = null
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json; charset=utf-8' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15_000),
          redirect: 'error',
        })
        const text = await response.text()
        let data = {}
        try { data = JSON.parse(text) } catch {}
        const payload = data?.data ?? data
        if (payload?.access_token) return payload
        last = payload ?? { error: `HTTP ${response.status}` }
      } catch (error) {
        last = { error: error instanceof Error ? error.message : String(error) }
      }
    }
    const detail = last?.error_description ?? last?.error ?? last?.msg ?? '获取用户令牌失败'
    throw new HttpError(502, `飞书授权失败：${detail}`, { feishuCode: last?.code })
  }

  async saveTokens(app, payload) {
    this.ensureAppRefs(app)
    const accessToken = asString(payload?.access_token)
    if (!accessToken) throw new HttpError(502, '飞书授权响应缺少 access_token')
    await this.vaultSet(app.userAccessTokenRef, accessToken)
    const refreshToken = asString(payload?.refresh_token)
    if (refreshToken) await this.vaultSet(app.refreshTokenRef, refreshToken)
    else await this.vaultUnset(app.refreshTokenRef).catch(() => undefined)
    const expiresIn = Number(payload?.expires_in) || 7200
    const scope = asString(payload?.scope)
    const granted = new Set(scope.split(/\s+/).filter(Boolean))
    const missing = scope ? SCOPES.filter((item) => item !== 'offline_access' && !granted.has(item)) : []
    app.auth = {
      authorized: true,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      scope,
      refreshable: Boolean(refreshToken),
      warning: missing.length ? `授权缺少权限：${missing.join('、')}` : null,
      error: null,
    }
    app.updatedAt = nowIso()
    this.flush()
    this.debug(`[oauth] tokens saved ${app.id} refreshable=${Boolean(refreshToken)} scope=${scope || '(empty)'}`)
  }

  resolveBaseUrl(candidate, req) {
    const configured = normalizeBaseUrl(this.config.publicBaseUrl)
    const incoming = normalizeBaseUrl(candidate)
    if (configured) {
      if (incoming && incoming !== configured) throw new HttpError(400, '访问地址与 publicBaseUrl 不一致')
      return configured
    }
    let fallback = ''
    try { fallback = normalizeBaseUrl(this.ctx.webServer.getOrigin()) } catch {}
    if (!incoming) {
      if (!fallback) throw new HttpError(503, '无法确定 DSH 访问地址')
      return fallback
    }
    const referer = baseFromReferer(req)
    if (referer && incoming === referer && this.config.trustRefererBase !== false) {
      return incoming
    }
    if (!fallback) throw new HttpError(503, '无法确定 DSH 访问地址')
    const parsedIncoming = new URL(incoming)
    const parsedFallback = new URL(fallback)
    const loopback = parsedIncoming.hostname === '127.0.0.1' || parsedIncoming.hostname === 'localhost' || parsedIncoming.hostname === '[::1]'
    if (parsedIncoming.origin !== parsedFallback.origin && !(parsedIncoming.protocol === 'http:' && loopback)) {
      throw new HttpError(400, '不支持的访问地址；请通过浏览器页面发起授权，或在插件配置中设置 publicBaseUrl')
    }
    return incoming
  }

  ensureDesktopCallback() {
    if (this.desktopCallbackBase) return Promise.resolve(this.desktopCallbackBase)
    if (this.desktopCallbackPromise) return this.desktopCallbackPromise
    const configured = Number(this.config.desktopCallbackPort)
    const port = Number.isInteger(configured) && configured >= 1024 && configured <= 65535 ? configured : 32123
    this.desktopCallbackPromise = new Promise((resolve, reject) => {
      const server = createServer((req, res) => {
        let url
        try {
          url = new URL(req.url ?? '/', 'http://127.0.0.1')
        } catch {
          res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
          res.end('Bad Request')
          return
        }
        if (req.method === 'GET' && url.pathname === `${API_BASE}/oauth/callback`) {
          void this.oauthCallback(url, res).catch(() => {
            try {
              res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
              res.end('callback failed')
            } catch {}
          })
          return
        }
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
        res.end('Not Found')
      })
      server.once('error', (error) => {
        this.desktopCallbackPromise = null
        try { server.close() } catch {}
        const message = error?.code === 'EADDRINUSE'
          ? `桌面版授权回调端口 ${port} 被占用；请修改插件配置 desktopCallbackPort，并在飞书后台登记对应回调地址`
          : `桌面版授权回调服务启动失败：${error instanceof Error ? error.message : String(error)}`
        reject(new HttpError(400, message))
      })
      server.listen(port, '127.0.0.1', () => {
        const address = server.address()
        const actual = address && typeof address === 'object' ? address.port : port
        this.desktopCallbackServer = server
        this.desktopCallbackBase = `http://127.0.0.1:${actual}`
        this.debug(`[oauth] desktop callback listening ${this.desktopCallbackBase}`)
        resolve(this.desktopCallbackBase)
      })
      server.unref?.()
    })
    return this.desktopCallbackPromise
  }

  closeDesktopCallback() {
    const server = this.desktopCallbackServer
    this.desktopCallbackServer = null
    this.desktopCallbackBase = ''
    this.desktopCallbackPromise = null
    if (!server) return Promise.resolve()
    return new Promise((resolve) => {
      try {
        server.close(() => resolve())
      } catch {
        resolve()
      }
    })
  }

  async oauthStart(appId, url, req) {
    const app = this.appById(appId)
    await this.appSecret(app)
    const rawBase = url.searchParams.get('base') ?? url.searchParams.get('origin') ?? ''
    const desktop = url.searchParams.get('desktop') === '1' && isDesktopBase(rawBase)
    const base = desktop ? await this.ensureDesktopCallback() : this.resolveBaseUrl(rawBase, req)
    const redirectUri = `${base}${API_BASE}/oauth/callback`
    this.cleanupStates()
    const state = randomBytes(24).toString('hex')
    this.oauthStates.set(state, { appId: app.id, redirectUri, createdAt: Date.now() })
    const query = new URLSearchParams({
      client_id: app.appId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: SCOPES.join(' '),
      state,
      prompt: 'consent',
    })
    this.debug(`[oauth] start ${app.id} base=${base}`)
    return {
      url: `${ACCOUNTS_BASE}/open-apis/authen/v1/authorize?${query.toString()}`,
      redirectUri,
    }
  }

  cleanupStates() {
    const cutoff = Date.now() - STATE_TTL_MS
    for (const [state, entry] of this.oauthStates) {
      if (entry.createdAt < cutoff) this.oauthStates.delete(state)
    }
  }

  async oauthStatus(appId) {
    const app = this.appById(appId)
    const access = await this.vaultGet(app.userAccessTokenRef)
    return {
      authorized: Boolean(access) && app.auth?.authorized !== false,
      expiresAt: app.auth?.expiresAt ?? null,
      scope: app.auth?.scope ?? '',
      refreshable: Boolean(app.auth?.refreshable),
      warning: app.auth?.warning ?? null,
      error: app.auth?.error ?? null,
    }
  }

  async oauthCallback(url, res) {
    const state = url.searchParams.get('state') ?? ''
    const entry = this.oauthStates.get(state)
    this.oauthStates.delete(state)
    if (!entry || Date.now() - entry.createdAt > STATE_TTL_MS) {
      this.callbackPage(res, false, '授权已过期，请回到 DSH 重新发起')
      return
    }
    const error = url.searchParams.get('error')
    if (error) {
      this.callbackPage(res, false, error === 'access_denied' ? '你取消了授权' : '授权失败')
      return
    }
    const code = url.searchParams.get('code')
    if (!code) {
      this.callbackPage(res, false, '授权回调缺少 code')
      return
    }
    const app = this.state.apps.find((item) => item.id === entry.appId)
    if (!app) {
      this.callbackPage(res, false, '机器人已被删除')
      return
    }
    try {
      const secret = await this.appSecret(app)
      const payload = await this.tokenRequest({
        grant_type: 'authorization_code',
        client_id: app.appId,
        client_secret: secret,
        code,
        redirect_uri: entry.redirectUri,
      })
      await this.saveTokens(app, payload)
      this.debug(`[oauth] callback ok ${app.id}`)
      this.callbackPage(res, true, '授权成功，正在关闭…')
    } catch (error) {
      this.debug(`[oauth] callback failed ${app.id}: ${error instanceof Error ? error.message : String(error)}`)
      this.log.error(`[oauth] ${app.id} 授权失败: ${error instanceof Error ? error.message : String(error)}`)
      this.callbackPage(res, false, '授权失败，请回到 DSH 查看日志后重试')
    }
  }

  callbackPage(res, ok, message) {
    const payload = JSON.stringify({ type: 'dsh-feishu-client:oauth', ok }).replaceAll('<', '\\u003c')
    const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>飞书授权</title>
<style>
:root{color-scheme:light dark}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f6f7;color:#1f2329;font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
@media (prefers-color-scheme:dark){body{background:#17181a;color:#e8e9ea}}
.card{padding:28px 32px;border-radius:12px;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.08);max-width:360px;text-align:center}
@media (prefers-color-scheme:dark){.card{background:#232427;box-shadow:none}}
h1{font-size:16px;margin:0 0 8px}
p{margin:0;color:#646a73}
@media (prefers-color-scheme:dark){p{color:#a6a9ad}}
</style></head>
<body><div class="card"><h1>${ok ? '授权成功' : '授权未完成'}</h1><p>${escapeHtml(message)}</p></div>
<script>
try { if (window.opener) window.opener.postMessage(${payload}, '*') } catch (error) {}
${ok ? 'setTimeout(function(){ window.close() }, 900)' : ''}
</script></body></html>`
    if (res.headersSent) return
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
    res.end(html)
  }

  setChat(app, chatId) {
    const value = asString(chatId).trim()
    if (!value) throw new HttpError(400, 'Chat ID 不能为空')
    if (!value.startsWith('oc_')) throw new HttpError(400, 'Chat ID 应以 oc_ 开头')
    app.chatId = value
    app.updatedAt = nowIso()
    this.flush()
    this.debug(`[chat] bound ${app.id}`)
    return app
  }

  async discoverChat(appId) {
    const app = this.appById(appId)
    const access = await this.userToken(app)
    this.debug(`[discover] ${app.id}`)
    const user = await this.feishu(access, '/open-apis/authen/v1/user_info')
    const openId = asString(user?.open_id)
    if (!openId) throw new HttpError(502, '无法获取用户 open_id，请重新授权')
    const tenant = await this.tenantToken(app)
    const sent = await this.feishu(tenant, '/open-apis/im/v1/messages?receive_id_type=open_id', {
      method: 'POST',
      body: {
        receive_id: openId,
        msg_type: 'text',
        content: JSON.stringify({ text: `DSH飞书客户端：已绑定「${app.name}」。这条是设置消息，可忽略。` }),
        uuid: randomUUID(),
      },
    })
    const chatId = asString(sent?.chat_id)
    if (!chatId) throw new HttpError(502, '绑定失败：机器人发送设置消息后没有返回 chat_id')
    const created = !app.chatId
    this.setChat(app, chatId)
    return {
      app: this.viewApp(app),
      user: { name: asString(user?.name), avatar: asString(user?.avatar_url) },
      created,
    }
  }

  async bindChatManually(appId, body) {
    const app = this.appById(appId)
    const created = !app.chatId
    this.setChat(app, body?.chatId)
    return { app: this.viewApp(app), created }
  }

  normalize(item, app) {
    if (!item || typeof item !== 'object') return null
    if (item.deleted === true) return null
    const sender = item.sender ?? {}
    const senderId = asString(sender.id)
    const senderType = asString(sender.sender_type)
    const role = senderType === 'user' ? 'user' : senderId === app.appId ? 'assistant' : 'system'
    const msgType = asString(item.msg_type) || 'unknown'
    const content = parseJson(item.body?.content ?? item.content)
    const attachments = []
    let text = ''
    if (msgType === 'text') text = asString(content.text)
    else if (msgType === 'post') {
      text = postText(content)
      const post = content?.content ? content : content?.zh_cn ?? content?.en_us ?? Object.values(content ?? {})[0]
      const rows = Array.isArray(post?.content) ? post.content : []
      for (const row of rows) {
        if (!Array.isArray(row)) continue
        for (const element of row) {
          if (!element || typeof element !== 'object') continue
          if (element.tag === 'img' && asString(element.image_key)) {
            const key = asString(element.image_key)
            attachments.push({ kind: 'image', fileKey: key, imageKey: key, resourceType: 'image', name: '图片' })
          } else if (element.tag === 'media' && asString(element.file_key)) {
            const fileKey = asString(element.file_key)
            attachments.push({
              kind: 'video',
              fileKey,
              imageKey: asString(element.image_key),
              resourceType: 'file',
              name: asString(element.file_name) || '视频',
              duration: Number(element.duration) || 0,
            })
          }
        }
      }
      if (attachments.length) text = text.replace(/(?:^|\n)\[图片\](?=\n|$)/g, '').trim()
    } else if (msgType === 'interactive') text = cardText(content)
    else if (msgType === 'image') {
      const key = asString(content.image_key)
      text = '[图片]'
      if (key) attachments.push({ kind: 'image', fileKey: key, imageKey: key, resourceType: 'image', name: '图片' })
    } else if (msgType === 'file') {
      const fileKey = asString(content.file_key)
      const name = asString(content.file_name) || '文件'
      text = `[文件] ${name}`.trim()
      if (fileKey) attachments.push({
        kind: mediaKindFromName(name),
        fileKey,
        resourceType: 'file',
        name,
        size: Number(content.file_size) || 0,
      })
    } else if (msgType === 'audio') {
      const fileKey = asString(content.file_key)
      text = '[语音]'
      if (fileKey) attachments.push({
        kind: 'audio',
        fileKey,
        resourceType: 'file',
        name: '语音',
        duration: Number(content.duration) || 0,
      })
    } else if (msgType === 'media') {
      const fileKey = asString(content.file_key)
      text = '[视频]'
      if (fileKey) attachments.push({
        kind: 'video',
        fileKey,
        imageKey: asString(content.image_key),
        resourceType: 'file',
        name: asString(content.file_name) || '视频',
        duration: Number(content.duration) || 0,
      })
    } else if (msgType === 'sticker') text = '[表情]'
    else text = `[${msgType}]`
    const actions = msgType === 'interactive' ? cardActions(content, text) : []
    const choices = msgType === 'interactive' ? cardChoices(content) : []
    const serverCreatedAt = Number(item.create_time) || 0
    return {
      id: asString(item.message_id) || randomUUID(),
      role,
      text,
      kind: msgType,
      createdAt: serverCreatedAt || Date.now(),
      ...(serverCreatedAt ? { serverCreatedAt } : {}),
      senderId,
      senderName: role === 'assistant' ? 'DSH' : role === 'user' ? '你' : '其他应用',
      ...(actions.length ? { actions } : {}),
      ...(choices.length ? { choices } : {}),
      ...(attachments.length ? { attachments } : {}),
    }
  }

  async listMessages(appId, url) {
    const app = this.appById(appId)
    if (!app.chatId) throw new HttpError(400, '还没有绑定单聊，请先完成绑定')
    const items = await this.listRaw(app, 50)
    const since = Number(url.searchParams.get('since') ?? 0)
    return items
      .map((item) => this.normalize(item, app))
      .filter(Boolean)
      .filter((message) => !since || message.createdAt > since)
      .sort((left, right) => left.createdAt - right.createdAt)
  }

  async sendUserText(app, value, options = {}) {
    const text = asString(value).trim()
    if (!text) throw new HttpError(400, '消息不能为空')
    if (text.length > 100_000) throw new HttpError(400, '消息过长')
    this.debug(`[send] ${app.id} len=${text.length}`)
    const token = await this.userToken(app)
    const clientId = options.uuid ?? randomUUID()
    const data = await this.feishu(token, '/open-apis/im/v1/messages?receive_id_type=chat_id', {
      method: 'POST',
      body: {
        receive_id: app.chatId,
        msg_type: 'text',
        content: JSON.stringify({ text }),
        uuid: clientId,
      },
    })
    if (data?.message_id) {
      const normalized = this.normalize(data, app)
      if (normalized) return normalized
    }
    return {
      id: randomUUID(),
      role: 'user',
      text,
      kind: 'text',
      createdAt: Date.now(),
      senderId: '',
      senderName: '你',
    }
  }

  async sendUserPost(app, text, images, options = {}) {
    const body = asString(text).trim()
    if (!body) throw new HttpError(400, '消息不能为空')
    if (body.length > 100_000) throw new HttpError(400, '消息过长')
    const keys = (Array.isArray(images) ? images : [])
      .map((image) => asString(image?.imageKey ?? image?.fileKey))
      .filter(Boolean)
    if (!keys.length) return this.sendUserText(app, body, options)
    const content = {
      zh_cn: {
        title: '',
        content: [
          [{ tag: 'text', text: body }],
          ...keys.map((key) => [{ tag: 'img', image_key: key }]),
        ],
      },
    }
    this.debug(`[send] ${app.id} post len=${body.length} images=${keys.length}`)
    const token = await this.userToken(app)
    const data = await this.feishu(token, '/open-apis/im/v1/messages?receive_id_type=chat_id', {
      method: 'POST',
      body: {
        receive_id: app.chatId,
        msg_type: 'post',
        content: JSON.stringify(content),
        uuid: options.uuid ?? randomUUID(),
      },
    })
    if (data?.message_id) {
      const normalized = this.normalize(data, app)
      if (normalized) return normalized
    }
    throw new HttpError(502, '飞书发送富文本消息未返回 message_id')
  }

  async sendMessage(appId, body) {
    const app = this.appById(appId)
    if (!app.chatId) throw new HttpError(400, '还没有绑定单聊，请先完成绑定')
    if (body?.attachment) return this.sendAttachment(app, body)
    return { message: await this.sendUserText(app, body?.text) }
  }

  async sendAttachment(app, body) {
    const text = asString(body?.text).trim()
    if (text.length > 100_000) throw new HttpError(400, '消息过长')
    const attachment = body?.attachment
    if (!attachment || typeof attachment !== 'object') throw new HttpError(400, '附件信息无效')
    const messages = []
    if (text) messages.push(await this.sendUserText(app, text))
    try {
      messages.push(await this.sendUserMedia(app, attachment))
    } catch (error) {
      if (!messages.length) throw error
      return {
        messages,
        attachmentSent: false,
        warning: `文字已发送，附件发送失败：${error instanceof Error ? error.message : String(error)}`,
      }
    }
    return { messages, attachmentSent: true }
  }

  async sendUserMedia(app, attachment, options = {}) {
    const messageType = attachment.messageType === 'image' ? 'image' : 'file'
    const imageKey = asString(attachment.imageKey)
    const fileKey = asString(attachment.fileKey)
    if (messageType === 'image' && !imageKey) throw new HttpError(400, '图片 Key 缺失，请重新选择附件')
    if (messageType === 'file' && !fileKey) throw new HttpError(400, '文件 Key 缺失，请重新选择附件')
    const content = messageType === 'image' ? { image_key: imageKey } : { file_key: fileKey }
    this.debug(`[send] ${app.id} media=${messageType}`)
    const token = await this.userToken(app)
    const data = await this.feishu(token, '/open-apis/im/v1/messages?receive_id_type=chat_id', {
      method: 'POST',
      body: {
        receive_id: app.chatId,
        msg_type: messageType,
        content: JSON.stringify(content),
        uuid: options.uuid ?? randomUUID(),
      },
    })
    if (data?.message_id) {
      const normalized = this.normalize(data, app)
      if (normalized) return normalized
    }
    const kind = asString(attachment.kind) || (messageType === 'image' ? 'image' : 'file')
    return {
      id: randomUUID(),
      role: 'user',
      text: messageType === 'image' ? '[图片]' : `[文件] ${asString(attachment.name) || '文件'}`,
      kind: messageType,
      createdAt: Date.now(),
      senderId: '',
      senderName: '你',
      attachments: [{ ...attachment, resourceType: messageType === 'image' ? 'image' : 'file', kind }],
    }
  }

  async uploadBuffer(app, input) {
    const buffer = input?.buffer
    if (!buffer || !buffer.length) throw new HttpError(400, '附件为空')
    const name = sanitizeFileName(input?.name)
    const mime = asString(input?.mime).split(';')[0].trim() || 'application/octet-stream'
    const requested = asString(input?.kind)
    const kind = ['image', 'audio', 'video', 'file'].includes(requested) ? requested : 'file'
    this.debug(`[upload] ${app.id} kind=${kind} bytes=${buffer.length}`)
    if (kind === 'image') {
      const form = new FormData()
      form.append('image_type', 'message')
      form.append('image', new Blob([buffer], { type: mime }), name)
      const data = await this.uploadForm(app, '/open-apis/im/v1/images', form)
      const imageKey = asString(data.image_key)
      if (!imageKey) throw new HttpError(502, '图片上传未返回 image_key')
      return { kind: 'image', name, size: buffer.length, mime, imageKey, fileKey: imageKey, messageType: 'image', resourceType: 'image' }
    }
    const form = new FormData()
    form.append('file_type', 'stream')
    form.append('file_name', name)
    form.append('file', new Blob([buffer], { type: mime }), name)
    const data = await this.uploadForm(app, '/open-apis/im/v1/files', form)
    const fileKey = asString(data.file_key)
    if (!fileKey) throw new HttpError(502, '文件上传未返回 file_key')
    return { kind, name, size: buffer.length, mime, fileKey, messageType: 'file', resourceType: 'file' }
  }

  async uploadMedia(appId, url, req) {
    const app = this.appById(appId)
    const requested = asString(url.searchParams.get('kind')) || 'file'
    const kind = ['image', 'audio', 'video', 'file'].includes(requested) ? requested : 'file'
    const name = sanitizeFileName(url.searchParams.get('name'))
    const mime = asString(req.headers['content-type']).split(';')[0].trim() || 'application/octet-stream'
    const maxBytes = kind === 'image' ? MAX_IMAGE_BYTES : MAX_UPLOAD_BYTES
    const buffer = await readRaw(req, maxBytes)
    if (!buffer.length) throw new HttpError(400, '附件为空')
    const attachment = await this.uploadBuffer(app, { buffer, name, mime, kind })
    return { attachment }
  }

  async uploadForm(app, path, form) {
    const token = await this.tenantToken(app)
    const response = await fetch(`${OPEN_BASE}${path}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: form,
      signal: AbortSignal.timeout(120_000),
    })
    const text = await response.text()
    let data = {}
    try { data = JSON.parse(text) } catch {}
    if (!response.ok || (data?.code !== undefined && Number(data.code) !== 0)) {
      throw new HttpError(502, friendlyFeishuError(data?.code ?? `HTTP ${response.status}`, data?.msg), { feishuCode: data?.code })
    }
    return data?.data ?? {}
  }

  async resource(appId, messageId, fileKey, type, range) {
    const app = this.appById(appId)
    if (!app.chatId) throw new HttpError(400, '还没有绑定单聊，请先完成绑定')
    const token = await this.tenantToken(app)
    const headers = { authorization: `Bearer ${token}` }
    if (type === 'file' && range) headers.range = range
    const response = await fetch(`${OPEN_BASE}/open-apis/im/v1/messages/${encodeURIComponent(messageId)}/resources/${encodeURIComponent(fileKey)}?type=${type}`, {
      headers,
      signal: AbortSignal.timeout(120_000),
    })
    if (!response.ok) {
      let data = {}
      try { data = JSON.parse(await response.text()) } catch {}
      throw new HttpError(response.status === 404 ? 404 : 502, friendlyFeishuError(data?.code ?? response.status, data?.msg), { feishuCode: data?.code })
    }
    return response
  }

  async downloadResource(app, messageId, fileKey, type, maxBytes) {
    const response = await this.resource(app.id, messageId, fileKey, type)
    const buffer = Buffer.from(await response.arrayBuffer())
    if (maxBytes && buffer.length > maxBytes) {
      throw new HttpError(400, `附件超过 ${maxBytes} 字节上限`)
    }
    return { buffer, contentType: asString(response.headers.get('content-type')) }
  }

  async reactions(app, messageId) {
    const token = await this.tenantToken(app)
    const data = await this.feishu(token, `/open-apis/im/v1/messages/${encodeURIComponent(messageId)}/reactions?page_size=50`)
    return Array.isArray(data?.items) ? data.items : []
  }

  updateLastAsk(app, entry) {
    try {
      app.lastAsk = {
        at: entry?.at ?? nowIso(),
        status: asString(entry?.status) || 'unknown',
        durationMs: Number(entry?.durationMs) || 0,
        requestId: asString(entry?.requestId),
      }
      app.updatedAt = nowIso()
      this.flush()
    } catch (error) {
      this.debug(`[agent-tool] update lastAsk failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  localFeishuChannelsAppIds() {
    return readLocalFeishuChannelsAppIds()
  }

  sendJson(res, status, payload) {
    if (res.headersSent) return
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    })
    res.end(JSON.stringify(payload))
  }

  fail(res, error) {
    if (error instanceof HttpError) {
      this.debug(`[api] ${error.status} ${error.message}${error.feishuCode !== undefined ? ` code=${error.feishuCode}` : ''}`)
      this.log.warn(`[api] ${error.message}${error.feishuCode !== undefined ? ` code=${error.feishuCode}` : ''}`)
      this.sendJson(res, error.status, {
        ok: false,
        error: error.message,
        ...(error.feishuCode !== undefined ? { feishuCode: error.feishuCode } : {}),
      })
      return
    }
    this.debug(`[api] 500 ${error instanceof Error ? error.message : String(error)}`)
    this.log.error(`[api] ${error instanceof Error ? error.stack ?? error.message : String(error)}`)
    this.sendJson(res, 500, { ok: false, error: '操作失败，请查看本机日志' })
  }

  reject(req) {
    const connection = this.ctx.get('connection')
    if (!connection || typeof connection.requestRejection !== 'function') {
      throw new HttpError(503, '宿主认证服务尚未就绪；请稍后重试或升级 DSH')
    }
    return connection.requestRejection({ headers: req.headers })
  }

  async handle(req, res) {
    const method = (req.method ?? 'GET').toUpperCase()
    const url = new URL(req.url ?? '/', 'http://localhost')
    const path = url.pathname.startsWith(API_BASE)
      ? url.pathname.slice(API_BASE.length) || '/'
      : '/'
    try {
      if (path === '/oauth/callback' && method === 'GET') {
        await this.oauthCallback(url, res)
        return
      }
      const rejection = this.reject(req)
      if (rejection !== undefined) {
        this.sendJson(res, rejection, {
          ok: false,
          error: rejection === 401 ? '请先登录 DSH' : '宿主拒绝此请求',
        })
        return
      }
      if (method !== 'GET' && req.headers['x-dsh-feishu-client'] !== '1') {
        this.sendJson(res, 403, { ok: false, error: '缺少客户端请求头' })
        return
      }
      if (path === '/state' && method === 'GET') {
        this.sendJson(res, 200, { ok: true, ...this.stateView() })
        return
      }
      if (path === '/apps' && method === 'POST') {
        const body = await this.readJson(req)
        const app = await this.createApp(body)
        this.sendJson(res, 200, { ok: true, app })
        return
      }
      const parts = path.split('/').filter(Boolean)
      if (parts[0] === 'apps' && parts[1]) {
        const appId = decodeURIComponent(parts[1])
        if (parts.length === 2 && method === 'PATCH') {
          const body = await this.readJson(req)
          const app = await this.updateApp(appId, body)
          this.sendJson(res, 200, { ok: true, app })
          return
        }
        if (parts.length === 2 && method === 'DELETE') {
          await this.deleteApp(appId)
          this.sendJson(res, 200, { ok: true })
          return
        }
        if (parts.length === 3 && parts[2] === 'test' && method === 'POST') {
          const result = await this.testApp(appId)
          this.sendJson(res, 200, { ok: true, ...result })
          return
        }
        if (parts.length === 4 && parts[2] === 'oauth' && parts[3] === 'start' && method === 'GET') {
          const result = await this.oauthStart(appId, url, req)
          this.sendJson(res, 200, { ok: true, ...result })
          return
        }
        if (parts.length === 4 && parts[2] === 'oauth' && parts[3] === 'status' && method === 'GET') {
          const result = await this.oauthStatus(appId)
          this.sendJson(res, 200, { ok: true, ...result })
          return
        }
        if (parts.length === 3 && parts[2] === 'discover-chat' && method === 'POST') {
          const result = await this.discoverChat(appId)
          this.sendJson(res, 200, { ok: true, ...result })
          return
        }
        if (parts.length === 3 && parts[2] === 'chat' && method === 'POST') {
          const body = await this.readJson(req)
          const result = await this.bindChatManually(appId, body)
          this.sendJson(res, 200, { ok: true, ...result })
          return
        }
        if (parts.length === 3 && parts[2] === 'media' && method === 'POST') {
          const result = await this.uploadMedia(appId, url, req)
          this.sendJson(res, 200, { ok: true, ...result })
          return
        }
        if (parts.length === 6 && parts[2] === 'messages' && parts[4] === 'resources' && method === 'GET') {
          const messageId = decodeURIComponent(parts[3])
          const fileKey = decodeURIComponent(parts[5])
          const type = url.searchParams.get('type')
          if (type !== 'image' && type !== 'file') throw new HttpError(400, '资源类型无效')
          const response = await this.resource(appId, messageId, fileKey, type, req.headers.range)
          const download = url.searchParams.get('download') === '1'
          const name = sanitizeFileName(url.searchParams.get('name'))
          const headers = {
            'content-type': response.headers.get('content-type') || 'application/octet-stream',
            'cache-control': 'private, max-age=300',
            'content-disposition': download ? `attachment; filename*=UTF-8''${encodeURIComponent(name)}` : 'inline',
          }
          const length = response.headers.get('content-length')
          if (length) headers['content-length'] = length
          const range = response.headers.get('content-range')
          if (range) headers['content-range'] = range
          const acceptRanges = response.headers.get('accept-ranges')
          if (acceptRanges) headers['accept-ranges'] = acceptRanges
          res.writeHead(response.status, headers)
          if (!response.body) {
            res.end()
            return
          }
          const stream = Readable.fromWeb(response.body)
          res.on('close', () => stream.destroy())
          stream.on('error', () => res.destroy())
          stream.pipe(res)
          return
        }
        if (parts.length === 3 && parts[2] === 'messages' && method === 'GET') {
          const messages = await this.listMessages(appId, url)
          this.sendJson(res, 200, { ok: true, messages })
          return
        }
        if (parts.length === 3 && parts[2] === 'messages' && method === 'POST') {
          const body = await this.readJson(req)
          const result = await this.sendMessage(appId, body)
          this.sendJson(res, 200, { ok: true, ...result })
          return
        }
      }
      this.sendJson(res, 404, { ok: false, error: '接口不存在' })
    } catch (error) {
      this.fail(res, error)
    }
  }

  async readJson(req) {
    const text = await readBody(req)
    if (!text.trim()) return {}
    try {
      const parsed = JSON.parse(text)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not object')
      return parsed
    } catch {
      throw new HttpError(400, '请求体不是合法 JSON')
    }
  }
}

export function apply(ctx, config) {
  const service = new FeishuClient(ctx, config)
  ctx.effect(() => service.start(), 'dsh-feishu-client.http')
  ctx.inject(['tools'], (toolsCtx) => {
    const bridge = new AgentBridge(service, toolsCtx)
    toolsCtx.effect(() => bridge.start(), 'dsh-feishu-client.agent-tools')
  })
}

export { FeishuClient }
