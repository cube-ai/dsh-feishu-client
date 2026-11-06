import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createServer } from 'node:http'
import {
  AgentBridge,
  aggregateReply,
  approvalValue,
  classifyReactions,
  filterRemotes,
  isApprovalAction,
  kindFromName,
  localFeishuChannelsAppIds,
  normalizeAgentTools,
  normalizeTags,
  resolveApp,
} from '../lib/agent-bridge.js'
import { FeishuClient, isDesktopBase, normalizeBaseUrl } from '../lib/index.js'

const apps = [
  { id: 'app_a', name: '家里的 DSH', appId: 'cli_a', chatId: 'oc_a', description: 'RTX 4090，图像生成', tags: ['gpu', 'image'], auth: { authorized: true } },
  { id: 'app_b', name: '公司的 DSH', appId: 'cli_b', chatId: 'oc_b', description: '数据集和报表', tags: ['data'], auth: { authorized: true } },
]

test('normalizeTags trims, dedupes, caps', () => {
  const tags = normalizeTags([' GPU ', 'gpu', 'image', '', 'x'.repeat(40)])
  assert.deepEqual(tags, ['GPU', 'image', 'x'.repeat(32)])
})

test('normalizeTags accepts comma separated string', () => {
  assert.deepEqual(normalizeTags('gpu, image，home'), ['gpu', 'image', 'home'])
})

test('classifyReactions recognizes terminal states from the app only', () => {
  assert.equal(classifyReactions([{ operator: { operator_type: 'app', operator_id: 'cli_a' }, reaction_type: { emoji_type: 'DONE' } }], 'cli_a'), 'done')
  assert.equal(classifyReactions([{ operator: { operator_type: 'app' }, reaction_type: { emoji_type: 'ERROR' } }], 'cli_a'), 'error')
  assert.equal(classifyReactions([{ operator: { operator_type: 'app' }, reaction_type: { emoji_type: 'OnIt' } }], 'cli_a'), 'processing')
  assert.equal(classifyReactions([{ operator: { operator_type: 'user' }, reaction_type: { emoji_type: 'DONE' } }], 'cli_a'), 'none')
  assert.equal(classifyReactions([{ operator: { operator_type: 'app', operator_id: 'cli_other' }, reaction_type: { emoji_type: 'DONE' } }], 'cli_a'), 'none')
})

test('resolveApp handles id, name, ambiguity and omission', () => {
  assert.equal(resolveApp(apps, 'app_a').app.id, 'app_a')
  assert.equal(resolveApp(apps, '家里的 dsh').app.id, 'app_a')
  assert.equal(resolveApp(apps, '').kind, 'many')
  assert.equal(resolveApp([apps[0]], '').app.id, 'app_a')
  assert.equal(resolveApp(apps, 'missing').kind, 'none')
  const duplicate = [apps[0], { ...apps[1], name: '家里的 DSH' }]
  assert.equal(resolveApp(duplicate, '家里的 DSH').kind, 'many')
})

test('filterRemotes matches name, description and tags', () => {
  assert.equal(filterRemotes(apps, 'gpu').length, 1)
  assert.equal(filterRemotes(apps, '图片').length, 1)
  assert.equal(filterRemotes(apps, '报表').length, 1)
  assert.equal(filterRemotes(apps, 'DSH').length, 2)
  assert.equal(filterRemotes(apps, '').length, 2)
})

test('approval actions map to canonical verdicts', () => {
  assert.equal(isApprovalAction({ label: '批准一次' }), true)
  assert.equal(isApprovalAction({ label: '下一页' }), false)
  assert.equal(approvalValue({ label: '批准一次' }), '批准')
  assert.equal(approvalValue({ label: '同意' }), '批准')
  assert.equal(approvalValue({ label: '拒绝' }), '拒绝')
  assert.equal(approvalValue({ label: 'no' }), '拒绝')
  assert.equal(approvalValue({ label: '下一页' }), '')
})

test('aggregateReply skips placeholders and approval cards', () => {
  const messages = [
    { id: '1', role: 'assistant', text: '先看一下。', kind: 'text' },
    { id: '2', role: 'assistant', text: '[图片]', kind: 'image' },
    { id: '3', role: 'assistant', text: '需要你的审批', kind: 'interactive', actions: [{ label: '批准', text: '批准', index: 0 }] },
    { id: '4', role: 'assistant', text: '最终答案。', kind: 'interactive' },
    { id: '5', role: 'user', text: '谢谢', kind: 'text' },
  ]
  const result = aggregateReply(messages, 1000)
  assert.equal(result.reply, '先看一下。\n\n最终答案。')
  assert.equal(result.lastReply, '最终答案。')
  assert.equal(result.truncated, false)
})

test('aggregateReply truncates long replies', () => {
  const result = aggregateReply([{ id: '1', role: 'assistant', text: 'x'.repeat(200), kind: 'text' }], 100)
  assert.equal(result.truncated, true)
  assert.ok(result.reply.length <= 100)
})

test('normalizeAgentTools applies defaults and clamps', () => {
  const config = normalizeAgentTools({ defaultTimeoutSeconds: 1, maxTimeoutSeconds: 9999, attachments: { maxCount: 99 } })
  assert.equal(config.enabled, true)
  assert.equal(config.defaultTimeoutSeconds, 30)
  assert.equal(config.maxTimeoutSeconds, 600)
  assert.equal(config.attachments.maxCount, 4)
  assert.equal(config.remoteApproval, 'ask-local')
})

test('kindFromName recognizes raster images only', () => {
  assert.equal(kindFromName('chart.png'), 'image')
  assert.equal(kindFromName('photo.JPG'), 'image')
  assert.equal(kindFromName('doc.pdf'), 'file')
  assert.equal(kindFromName('vector.svg'), 'file')
})

test('localFeishuChannelsAppIds reads enabled channels', () => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-rf-test-'))
  try {
    mkdirSync(join(home, 'dsh-feishu-channels'), { recursive: true })
    writeFileSync(join(home, 'dsh-feishu-channels', 'channels.json'), JSON.stringify({
      channels: {
        a: { enabled: true, config: { appId: 'cli_a' } },
        b: { enabled: false, config: { appId: 'cli_b' } },
        c: { config: { appId: 'cli_c' } },
      },
    }))
    const ids = localFeishuChannelsAppIds(home)
    assert.deepEqual([...ids].sort(), ['cli_a', 'cli_c'])
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})


function makeApprovalBridge(outcome) {
  const app = { id: 'app_x', appId: 'cli_x', name: 'X', chatId: 'oc_x', auth: { authorized: true }, tags: [], description: '' }
  let approved = false
  const sent = []
  const service = {
    config: { agentTools: {} },
    state: { apps: [app] },
    debug() {},
    updateLastAsk() {},
    localFeishuChannelsAppIds: () => new Set(),
    async sendUserText(_app, text) {
      sent.push(text)
      if (text === '批准' || text === '拒绝') approved = true
      return { id: `om_${sent.length}`, createdAt: Date.now(), role: 'user', text }
    },
    async listSince() {
      return [{
        id: 'om_card',
        role: 'assistant',
        kind: 'interactive',
        text: '需要你的审批，请批准或拒绝。',
        actions: [{ label: '批准', text: '批准', index: 0 }, { label: '拒绝', text: '拒绝', index: 1 }],
        createdAt: Date.now(),
      }]
    },
    async reactions() {
      return approved
        ? [{ operator: { operator_type: 'app', operator_id: 'cli_x' }, reaction_type: { emoji_type: 'DONE' } }]
        : [{ operator: { operator_type: 'app', operator_id: 'cli_x' }, reaction_type: { emoji_type: 'OnIt' } }]
    },
    async sendUserPost() { throw new Error('not used') },
    async sendUserMedia() { throw new Error('not used') },
    async uploadBuffer() { throw new Error('not used') },
  }
  const ctx = {
    get(name) {
      if (name === 'approval') return { request: async () => outcome }
      return undefined
    },
  }
  return { bridge: new AgentBridge(service, ctx), sent }
}

test('approval bridge sends 批准 and completes', async () => {
  const { bridge, sent } = makeApprovalBridge('allowed-once')
  const result = await bridge.ask(
    { app: 'X', message: 'do it', timeout_seconds: 30 },
    { agent: { id: 'session-x' }, callId: 'call-x', signal: new AbortController().signal },
  )
  assert.equal(result.status, 'done')
  assert.ok(sent.includes('批准'))
})

test('approval bridge sends 拒绝 and completes', async () => {
  const { bridge, sent } = makeApprovalBridge('rejected')
  const result = await bridge.ask(
    { app: 'X', message: 'do it', timeout_seconds: 30 },
    { agent: { id: 'session-x' }, callId: 'call-x', signal: new AbortController().signal },
  )
  assert.equal(result.status, 'done')
  assert.ok(sent.includes('拒绝'))
})

test('approval bridge fails closed when local approval is unavailable', async () => {
  const { bridge, sent } = makeApprovalBridge('unavailable')
  const result = await bridge.ask(
    { app: 'X', message: 'do it', timeout_seconds: 30 },
    { agent: { id: 'session-x' }, callId: 'call-x', signal: new AbortController().signal },
  )
  assert.equal(result.status, 'error')
  assert.equal(result.code, 'approval_unavailable')
  assert.ok(!sent.includes('批准'))
  assert.ok(!sent.includes('拒绝'))
})


test('updateApp persists description, tags and v3 schema', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-rf-app-'))
  try {
    const app = {
      id: 'app_x', name: 'X', appId: 'cli_x',
      appSecretRef: 's', userAccessTokenRef: 'u', refreshTokenRef: 'r',
      chatId: 'oc_x', auth: { authorized: true },
    }
    writeFileSync(join(dir, 'apps.json'), JSON.stringify({ version: 2, apps: [app] }))
    const ctx = {
      logger: () => ({ info() {}, warn() {}, error() {} }),
      credentials: { async resolve() {}, async set() {}, async unset() {} },
      webServer: { register: () => () => {}, getOrigin: () => 'http://localhost:3080' },
    }
    const service = new FeishuClient(ctx, { stateDir: dir })
    const view = await service.updateApp('app_x', { description: 'GPU 机器', tags: 'gpu, 图像, gpu' })
    assert.equal(view.description, 'GPU 机器')
    assert.deepEqual(view.tags, ['gpu', '图像'])
    const saved = JSON.parse(readFileSync(join(dir, 'apps.json'), 'utf8'))
    assert.equal(saved.version, 3)
    assert.equal(saved.apps[0].description, 'GPU 机器')
    assert.deepEqual(saved.apps[0].tags, ['gpu', '图像'])
    await assert.rejects(() => service.updateApp('app_x', { name: '  ' }))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})


test('list query with no match returns all candidates', () => {
  const service = {
    config: { agentTools: {} },
    state: {
      apps: [
        { id: 'a', appId: 'cli_a', name: 'A', chatId: 'oc_a', auth: { authorized: true }, description: '', tags: [] },
        { id: 'b', appId: 'cli_b', name: 'B', chatId: 'oc_b', auth: { authorized: true }, description: '', tags: [] },
      ],
    },
    debug() {},
    localFeishuChannelsAppIds: () => new Set(),
  }
  const bridge = new AgentBridge(service, { get: () => undefined })
  const filtered = bridge.list({ query: '图片' })
  assert.equal(filtered.remotes.length, 0)
  assert.equal(filtered.total, 2)
  assert.equal(filtered.candidates.length, 2)
  assert.match(filtered.hint, /没有匹配/)
  const all = bridge.list({})
  assert.equal(all.remotes.length, 2)
  assert.equal(all.candidates, undefined)
})


test('cancelling a waiting ask releases the lock and records cancellation', async () => {
  const app = { id: 'app_x', appId: 'cli_x', name: 'X', chatId: 'oc_x', auth: { authorized: true }, tags: [], description: '' }
  const lastAsk = []
  const service = {
    config: { agentTools: {} },
    state: { apps: [app] },
    debug() {},
    updateLastAsk(_app, entry) { lastAsk.push(entry) },
    localFeishuChannelsAppIds: () => new Set(),
    async sendUserText() { return { id: 'om_1', createdAt: Date.now(), role: 'user', text: 'do' } },
    async listSince() { return [] },
    async reactions() { return [{ operator: { operator_type: 'app', operator_id: 'cli_x' }, reaction_type: { emoji_type: 'OnIt' } }] },
    async sendUserPost() { throw new Error('not used') },
    async sendUserMedia() { throw new Error('not used') },
    async uploadBuffer() { throw new Error('not used') },
  }
  const bridge = new AgentBridge(service, { get: () => undefined })
  const controller = new AbortController()
  setTimeout(() => controller.abort(), 300)
  const result = await bridge.ask(
    { app: 'X', message: 'do', timeout_seconds: 30 },
    { agent: { id: 'session-x' }, callId: 'call-x', signal: controller.signal },
  )
  assert.equal(result.status, 'error')
  assert.equal(result.code, 'cancelled')
  assert.equal(lastAsk.at(-1)?.status, 'cancelled')
  assert.equal(bridge.locks.has('app_x'), false)
})


test('remote cancellation notice is detected without a reaction', async () => {
  const app = { id: 'app_x', appId: 'cli_x', name: 'X', chatId: 'oc_x', auth: { authorized: true }, tags: [], description: '' }
  const service = {
    config: { agentTools: { pollIntervalMs: 500 } },
    state: { apps: [app] },
    debug() {},
    updateLastAsk() {},
    localFeishuChannelsAppIds: () => new Set(),
    async sendUserText() { return { id: 'om_1', createdAt: Date.now(), role: 'user', text: 'do' } },
    async listSince() {
      return [{ id: 'om_2', role: 'assistant', kind: 'text', text: '本次处理已停止，已返回的内容保留。可直接发消息继续。', createdAt: Date.now() }]
    },
    async reactions() { return [] },
    async sendUserPost() { throw new Error('not used') },
    async sendUserMedia() { throw new Error('not used') },
    async uploadBuffer() { throw new Error('not used') },
  }
  const bridge = new AgentBridge(service, { get: () => undefined })
  const result = await bridge.ask(
    { app: 'X', message: 'do', timeout_seconds: 30 },
    { agent: { id: 'session-x' }, callId: 'call-x', signal: new AbortController().signal },
  )
  assert.equal(result.status, 'error')
  assert.equal(result.code, 'cancelled')
})


test('createApp puts the new app first and persists description/tags', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-rf-create-'))
  try {
    const old = {
      id: 'app_old', name: 'Old', appId: 'cli_old',
      appSecretRef: 's_old', userAccessTokenRef: 'u_old', refreshTokenRef: 'r_old',
      chatId: 'oc_old', auth: { authorized: true }, description: '', tags: [],
    }
    writeFileSync(join(dir, 'apps.json'), JSON.stringify({ version: 3, apps: [old] }))
    const ctx = {
      logger: () => ({ info() {}, warn() {}, error() {} }),
      credentials: { async resolve() {}, async set() {}, async unset() {} },
      webServer: { register: () => () => {}, getOrigin: () => 'http://localhost:3080' },
    }
    const service = new FeishuClient(ctx, { stateDir: dir })
    const view = await service.createApp({
      name: 'New', appId: 'cli_new', appSecret: 'secret',
      description: 'GPU 机器', tags: 'gpu, image',
    })
    assert.equal(service.state.apps[0].id, view.id)
    assert.equal(service.state.apps[1].id, 'app_old')
    assert.equal(view.description, 'GPU 机器')
    assert.deepEqual(view.tags, ['gpu', 'image'])
    const saved = JSON.parse(readFileSync(join(dir, 'apps.json'), 'utf8'))
    assert.equal(saved.apps[0].id, view.id)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})


function makeBaseService(config = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-rf-base-'))
  const ctx = {
    logger: () => ({ info() {}, warn() {}, error() {} }),
    credentials: { async resolve() {}, async set() {}, async unset() {} },
    webServer: {
      register: () => () => {},
      getOrigin: () => 'http://127.0.0.1:3080',
      tapIndex: () => () => {},
    },
  }
  return { service: new FeishuClient(ctx, { stateDir: dir, ...config }), dir }
}

test('normalizeBaseUrl accepts and normalizes mount paths', () => {
  assert.equal(normalizeBaseUrl('https://host:6443/prefix/'), 'https://host:6443/prefix')
  assert.equal(normalizeBaseUrl('https://host:6443/prefix'), 'https://host:6443/prefix')
  assert.equal(normalizeBaseUrl('https://host/'), 'https://host')
  assert.equal(normalizeBaseUrl('http://127.0.0.1:3080'), 'http://127.0.0.1:3080')
  assert.equal(normalizeBaseUrl(''), '')
})

test('normalizeBaseUrl rejects query, hash, credentials, relative and non-http', () => {
  assert.throws(() => normalizeBaseUrl('https://host/prefix?x=1'))
  assert.throws(() => normalizeBaseUrl('https://host/prefix#x'))
  assert.throws(() => normalizeBaseUrl('https://user:pass@host/prefix'))
  assert.throws(() => normalizeBaseUrl('/prefix'))
  assert.throws(() => normalizeBaseUrl('ftp://host/prefix'))
})

test('resolveBaseUrl supports a configured path prefix', () => {
  const { service, dir } = makeBaseService({ publicBaseUrl: 'https://10.2.112.122:6443/cubeaispace-dsh2-1-35c331fc7c-dsh/' })
  try {
    assert.equal(
      service.resolveBaseUrl('https://10.2.112.122:6443/cubeaispace-dsh2-1-35c331fc7c-dsh'),
      'https://10.2.112.122:6443/cubeaispace-dsh2-1-35c331fc7c-dsh',
    )
    assert.throws(() => service.resolveBaseUrl('https://10.2.112.122:6443/other'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('resolveBaseUrl allows same-origin path without config and rejects external', () => {
  const { service, dir } = makeBaseService()
  try {
    assert.equal(service.resolveBaseUrl('http://127.0.0.1:3080'), 'http://127.0.0.1:3080')
    assert.equal(service.resolveBaseUrl('http://127.0.0.1:3080/prefix'), 'http://127.0.0.1:3080/prefix')
    assert.throws(() => service.resolveBaseUrl('https://10.2.112.122:6443/prefix'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('oauthStart builds a prefixed redirect_uri', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-rf-oauth-'))
  try {
    const app = {
      id: 'app_x', name: 'X', appId: 'cli_x',
      appSecretRef: 'secret_ref', userAccessTokenRef: 'u', refreshTokenRef: 'r',
      chatId: 'oc_x', auth: { authorized: true }, description: '', tags: [],
    }
    writeFileSync(join(dir, 'apps.json'), JSON.stringify({ version: 3, apps: [app] }))
    const ctx = {
      logger: () => ({ info() {}, warn() {}, error() {} }),
      credentials: { async resolve(ref) { return ref === 'secret_ref' ? 'secret' : undefined }, async set() {}, async unset() {} },
      webServer: { register: () => () => {}, getOrigin: () => 'http://127.0.0.1:3080', tapIndex: () => () => {} },
    }
    const service = new FeishuClient(ctx, {
      stateDir: dir,
      publicBaseUrl: 'https://10.2.112.122:6443/cubeaispace-dsh2-1-35c331fc7c-dsh',
    })
    const base = 'https://10.2.112.122:6443/cubeaispace-dsh2-1-35c331fc7c-dsh'
    const result = await service.oauthStart('app_x', new URL(`http://localhost/api?base=${encodeURIComponent(base)}`))
    assert.equal(result.redirectUri, `${base}/api/dsh-feishu-client/oauth/callback`)
    assert.match(result.url, /accounts\.feishu\.cn/)
    assert.ok(result.url.includes(encodeURIComponent(result.redirectUri)))

    const discovered = new FeishuClient(ctx, { stateDir: dir })
    const result2 = await discovered.oauthStart('app_x', new URL(`http://localhost/api?base=${encodeURIComponent(base)}`), { headers: { referer: `${base}/` } })
    assert.equal(result2.redirectUri, `${base}/api/dsh-feishu-client/oauth/callback`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('start injects the configured client base', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-rf-inject-'))
  try {
    let transform
    let tapped = false
    let route
    const ctx = {
      logger: () => ({ info() {}, warn() {}, error() {} }),
      credentials: { async resolve() {}, async set() {}, async unset() {} },
      webServer: {
        register: (definition) => { route = definition; return () => { route = null } },
        getOrigin: () => 'http://127.0.0.1:3080',
        tapIndex: (fn) => { transform = fn; return () => { tapped = true } },
      },
    }
    const service = new FeishuClient(ctx, {
      stateDir: dir,
      publicBaseUrl: 'https://10.2.112.122:6443/cubeaispace-dsh2-1-35c331fc7c-dsh',
    })
    const dispose = service.start()
    assert.equal(route.path, '/api/dsh-feishu-client')
    const html = transform('<html><head></head><body></body></html>')
    assert.match(html, /__DSH_FEISHU_CLIENT_BASE__/)
    assert.match(html, /https:\/\/10\.2\.112\.122:6443\/cubeaispace-dsh2-1-35c331fc7c-dsh/)
    const twice = transform(html)
    assert.equal((twice.match(/__DSH_FEISHU_CLIENT_BASE__/g) || []).length, 1)
    dispose()
    assert.equal(tapped, true)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})


test('resolveBaseUrl auto-detects the external base from the browser referer', () => {
  const { service, dir } = makeBaseService()
  try {
    const base = 'https://10.2.112.122:6443/cubeaispace-dsh2-1-35c331fc7c-dsh'
    assert.equal(
      service.resolveBaseUrl(base, { headers: { referer: `${base}/` } }),
      base,
    )
    assert.throws(() => service.resolveBaseUrl(base, { headers: {} }))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('resolveBaseUrl can disable referer auto-detection', () => {
  const { service, dir } = makeBaseService({ trustRefererBase: false })
  try {
    const base = 'https://10.2.112.122:6443/cubeaispace-dsh2-1-35c331fc7c-dsh'
    assert.throws(() => service.resolveBaseUrl(base, { headers: { referer: `${base}/` } }))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})


test('isDesktopBase recognizes the dsh-app scheme', () => {
  assert.equal(isDesktopBase('dsh-app://app/'), true)
  assert.equal(isDesktopBase('http://127.0.0.1:3080/'), false)
  assert.equal(isDesktopBase(''), false)
})

test('oauthStart uses the desktop callback server', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-rf-desktop-oauth-'))
  try {
    const app = {
      id: 'app_x', name: 'X', appId: 'cli_x',
      appSecretRef: 'secret_ref', userAccessTokenRef: 'u', refreshTokenRef: 'r',
      chatId: 'oc_x', auth: { authorized: true }, description: '', tags: [],
    }
    writeFileSync(join(dir, 'apps.json'), JSON.stringify({ version: 3, apps: [app] }))
    const ctx = {
      logger: () => ({ info() {}, warn() {}, error() {} }),
      credentials: { async resolve(ref) { return ref === 'secret_ref' ? 'secret' : undefined }, async set() {}, async unset() {} },
      webServer: { register: () => () => {}, getOrigin: () => 'http://127.0.0.1:3080', tapIndex: () => () => {} },
    }
    const service = new FeishuClient(ctx, { stateDir: dir })
    service.ensureDesktopCallback = async () => 'http://127.0.0.1:32123'
    const result = await service.oauthStart(
      'app_x',
      new URL('http://localhost/api?desktop=1&base=' + encodeURIComponent('dsh-app://app/')),
      { headers: {} },
    )
    assert.equal(result.redirectUri, 'http://127.0.0.1:32123/api/dsh-feishu-client/oauth/callback')
    assert.match(result.url, /redirect_uri=/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('desktop callback server serves the callback route', async () => {
  const { service, dir } = makeBaseService()
  const probe = createServer()
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve))
  const port = probe.address().port
  await new Promise((resolve) => probe.close(resolve))
  service.config.desktopCallbackPort = port
  try {
    const base = await service.ensureDesktopCallback()
    assert.equal(base, `http://127.0.0.1:${port}`)
    const response = await fetch(`${base}/api/dsh-feishu-client/oauth/callback?state=invalid`)
    assert.equal(response.status, 200)
    assert.match(await response.text(), /授权已过期/)
  } finally {
    await service.closeDesktopCallback()
    rmSync(dir, { recursive: true, force: true })
  }
})


test('normalize exposes the Feishu server timestamp', () => {
  const { service, dir } = makeBaseService()
  try {
    const message = service.normalize({
      message_id: 'om_time',
      msg_type: 'text',
      body: { content: JSON.stringify({ text: 'hello' }) },
      sender: { id: 'ou_user', sender_type: 'user' },
      create_time: '1700000000123',
    }, { appId: 'cli_x' })
    assert.equal(message.createdAt, 1700000000123)
    assert.equal(message.serverCreatedAt, 1700000000123)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('messageCreatedAt reads create_time from the message detail API', async () => {
  const { service, dir } = makeBaseService()
  try {
    service.tenantToken = async () => 'tenant-token'
    service.feishu = async (token, path) => {
      assert.equal(token, 'tenant-token')
      assert.match(path, /\/open-apis\/im\/v1\/messages\/om_time/)
      return { items: [{ create_time: '1700000000456' }] }
    }
    assert.equal(await service.messageCreatedAt({}, 'om_time'), 1700000000456)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('sendRequest uses the server anchor time even when the local clock is ahead', async () => {
  const app = { id: 'app_x', appId: 'cli_x', name: 'X', chatId: 'oc_x', auth: { authorized: true }, tags: [], description: '' }
  const serverAt = Date.now() - 3_600_000
  const localAt = Date.now() + 3_600_000
  const listCalls = []
  const service = {
    config: { agentTools: {} },
    state: { apps: [app] },
    debug() {},
    localFeishuChannelsAppIds: () => new Set(),
    async sendUserText() {
      return { id: 'om_anchor', role: 'user', text: 'do', createdAt: localAt }
    },
    async listSince(_app, since, pages) {
      listCalls.push({ since, pages })
      return since === 0
        ? [{ id: 'om_anchor', role: 'user', text: 'do', createdAt: serverAt, serverCreatedAt: serverAt }]
        : []
    },
    async reactions() { return [] },
    async sendUserPost() { throw new Error('not used') },
    async sendUserMedia() { throw new Error('not used') },
    async uploadBuffer() { throw new Error('not used') },
  }
  const bridge = new AgentBridge(service, { get: () => undefined })
  const record = {
    id: 'req_x',
    app,
    anchors: [],
    state: 'sending',
  }
  await bridge.sendRequest(record, 'do', [], {})
  assert.equal(record.anchors[0].serverCreatedAt, serverAt)
  assert.equal(record.since, serverAt - 1000)
  assert.ok(record.since < localAt - 1000)
  assert.deepEqual(listCalls[0], { since: 0, pages: 1 })
})


test('pollMessages replaces a same-id card update', async () => {
  const app = { id: 'app_x', appId: 'cli_x', name: 'X', chatId: 'oc_x', auth: { authorized: true }, tags: [], description: '' }
  let phase = 0
  const service = {
    config: { agentTools: {} },
    state: { apps: [app] },
    debug() {},
    async listSince() {
      return [{
        id: 'om_card',
        role: 'assistant',
        kind: 'interactive',
        text: phase === 0 ? 'WeKnora 正在思考' : '最终答案',
        createdAt: 1700000000000,
      }]
    },
  }
  const bridge = new AgentBridge(service, { get: () => undefined })
  const record = {
    id: 'req_card',
    app,
    collected: [],
    since: 0,
    lastMessageAt: 0,
    updatedAt: 0,
  }
  await bridge.pollMessages(record)
  assert.equal(record.collected.length, 1)
  assert.equal(record.collected[0].text, 'WeKnora 正在思考')
  const firstSeen = record.lastMessageAt
  phase = 1
  await bridge.pollMessages(record)
  assert.equal(record.collected.length, 1)
  assert.equal(record.collected[0].text, '最终答案')
  assert.ok(record.lastMessageAt >= firstSeen)
})
