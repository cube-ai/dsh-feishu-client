# dsh-feishu-client 插件技术文档

本文介绍 `@cubeai/dsh-feishu-client` 插件的当前架构、数据模型、飞书接入、Host API、Agent 工具、配置、部署和安全设计。

## 1. 概述

`dsh-feishu-client` 是以插件形式驻扎于 DSH 中的飞书客户端。它把一个飞书机器人应用同时用于两条链路：

1. **人通过 UI 访问远端智能体**：本地 DSH 以用户身份把消息发到飞书单聊，远端智能体通过飞书频道接收并处理，本插件读取回复、卡片、审批和附件。
2. **本地智能体访问远端智能体**：本地 DSH 的 Agent 工具调用远端，轮询消息和 reaction，把结果、审批和提问带回本地。

远端不要求是 DSH。任何接入了飞书频道、并且能处理用户消息的智能体都可以作为目标；DSH 远端使用 `@cubeai/dsh-feishu-channels` 插件。

关键约束：

- 一个飞书机器人应用 = 一个机器人 = 一个单聊；
- 发送使用 `user_access_token`，读取和资源下载使用 `tenant_access_token`；
- 目标智能体必须使用与本插件相同的飞书机器人应用；
- 本插件只使用公开飞书 API，不直接访问远端文件或会话 API。

## 2. 组件与架构

```text
DSH Web / Desktop
  Client (lib/client.js)
    ├─ sidebar.panellist「DSH飞书客户端」
    ├─ 机器人列表 / 添加机器人 / 设置 / 聊天
    ├─ Markdown + 代码块 + 附件 + 审批
    └─ 同源 fetch、图片/音频/视频资源
          │
          ▼
  Host (lib/index.js)
    ├─ /api/dsh-feishu-client/*
    ├─ apps.json 状态
    ├─ DSH Credential Vault
    ├─ OAuth / token refresh
    ├─ 飞书消息、媒体、资源 API
    └─ 资源代理
          │ HTTPS
          ▼
飞书开放平台
  ├─ OAuth / token
  ├─ im/v1/messages
  ├─ im/v1/images / files
  └─ im/v1/messages/:id/resources/:key
          │ Feishu 长连接
          ▼
目标智能体
  └─ @cubeai/dsh-feishu-channels（或其他飞书接入实现）
```

代码结构：

| 文件 | 作用 |
|---|---|
| `lib/index.js` | Host：状态、凭据、OAuth、飞书 API、消息、媒体、资源代理、管理路由 |
| `lib/agent-bridge.js` | Agent 工具：选择远端、发送、轮询、审批、提问、附件、锁 |
| `lib/client.js` | Client：侧边栏、机器人列表、聊天页、设置页、Markdown/代码块、媒体/审批 |
| `cordis.patch.yml` | Cordis bundle 入口，id `cubeai-feishu-client` |
| `locale/` | 中英文展示元数据 |

## 3. 请求模型

### 3.1 UI 消息

1. Client 调用同源 `/api/dsh-feishu-client/apps/:id/messages`；
2. Host 用该应用的用户 Token 调用飞书发送消息；
3. Host 轮询或按请求读取消息列表；
4. Client 合并、去重并渲染；
5. 图片、文件、音视频通过 Host 的资源代理读取，Token 不下发浏览器。

### 3.2 Agent 工具

1. Agent 调用 `feishu_client_ask`；
2. Host 解析目标应用并获取应用级锁；
3. 通过用户身份发送消息/附件；
4. 轮询 anchor 消息上的 `OnIt` / `DONE` / `ERROR` reaction，并读取新消息；
5. 收口为 `done`、`error`、`pending`、`needs_approval` 或 `needs_answer`；
6. `feishu_client_continue` 继续等待或回答；
7. 收口后释放锁并更新最近一次调用结果。

## 4. 状态与凭据

### 4.1 状态目录

默认：

```text
~/.dsh/dsh-feishu-client/apps.json
```

目录权限 `0700`，文件权限 `0600`。可通过 `stateDir` 配置覆盖。

### 4.2 `apps.json`

当前结构版本为 3：

```json
{
  "version": 3,
  "apps": [
    {
      "id": "app_xxx",
      "name": "远端DSH-3",
      "appId": "cli_xxx",
      "appSecretRef": "dsh_feishu_client_app_xxx_app_secret",
      "userAccessTokenRef": "dsh_feishu_client_app_xxx_user_access_token",
      "refreshTokenRef": "dsh_feishu_client_app_xxx_refresh_token",
      "chatId": "oc_xxx",
      "description": "部署在云端的 DSH 智能体，擅长图像分析",
      "tags": ["cloud", "image"],
      "lastAsk": {
        "at": "2026-10-23T06:00:00.000Z",
        "status": "done",
        "durationMs": 12345,
        "requestId": "req_xxx"
      },
      "auth": {
        "authorized": true,
        "expiresAt": "2026-10-23T06:00:00.000Z",
        "scope": "im:message im:message.send_as_user offline_access",
        "refreshable": true,
        "warning": null,
        "error": null
      }
    }
  ]
}
```

字段说明：

- `name`、`description`、`tags` 只影响本插件显示和远端选择；
- `chatId` 未绑定时为空；
- `auth` 保存授权状态、过期时间、scope 和可刷新信息；
- 明文 Secret 和 Token 不写入 `apps.json`。

### 4.3 Credential Vault

- App Secret：`dsh_feishu_client_<app.id>_app_secret`
- 用户 access token：`dsh_feishu_client_<app.id>_user_access_token`
- refresh token：`dsh_feishu_client_<app.id>_refresh_token`

`<app.id>` 是本地应用记录 ID，不是飞书 App ID；引用会做 `[A-Za-z0-9_]` 清洗。

### 4.4 调试日志

```text
~/.dsh/dsh-feishu-client/debug.log
```

记录 boot、应用增删改、OAuth、绑定、发送长度、媒体类型/大小和错误码；不包含 Secret、Token、消息正文或文件名。

## 5. OAuth 与单聊绑定

### 5.1 OAuth

- 授权地址：飞书 `accounts.feishu.cn`；
- 回调路径：`<base>/api/dsh-feishu-client/oauth/callback`；
- scope：`im:message im:message.send_as_user offline_access`；
- 使用一次性随机 `state`，10 分钟有效；
- 桌面版使用本机回调服务，默认端口 `32123`。

远端 `@cubeai/dsh-feishu-channels` 在扫码创建应用时需要自动写入以下回调地址（具体地址以实际部署为准）：

```text
http://127.0.0.1:3080/api/dsh-feishu-client/oauth/callback,
http://localhost:3080/api/dsh-feishu-client/oauth/callback,
http://127.0.0.1:32123/api/dsh-feishu-client/oauth/callback,
http://localhost:32123/api/dsh-feishu-client/oauth/callback,
http://127.0.0.1:8731/api/oauth/callback,
http://localhost:8731/api/oauth/callback,
https://www.cubeai.com:6443/cubeaispace-dsh1-1234567890-dsh/api/dsh-feishu-client/oauth/callback,
```

### 5.2 授权状态

Host 在授权完成后保存：

- access token 和 refresh token；
- `expiresAt`、scope、是否可刷新；
- warning/error 信息。

Client 通过 `/apps/:id/oauth/status` 读取状态；授权过期后可重新授权。

### 5.3 自动发现单聊

首次绑定时：

1. Host 调用 `user_info` 获取当前用户；
2. 用机器人身份发送一条设置消息；
3. 从发送响应中取得 `chat_id`；
4. 写回 `apps.json`。

设置消息只用于确定单聊，不需要用户回复。

## 6. 飞书消息

### 6.1 发送

- 纯文本：`msg_type=text`；
- 图片 + 文字：上传图片后发送 `post`；
- 文件：先上传并发送文件消息，再发送文字指令（Agent 工具场景）；
- 语音/视频：按文件消息发送，保持与远端飞书频道的兼容性。

### 6.2 读取与归一化

Host 读取最近消息并归一化为统一结构：

- 文本；
- `post` 中的文本和图片；
- 图片、文件、音频、视频附件；
- 卡片正文；
- 卡片按钮和审批动作。

回复会过滤机器人自己发出的设置消息，并按 `message_id` 去重。

### 6.3 资源代理

Client 不直接访问飞书资源，而是通过 Host：

```text
GET /api/dsh-feishu-client/apps/:id/messages/:messageId/resources/:fileKey
```

支持 `type=image|file`、`download=1` 和 `name` 参数；Host 只接受 `image`/`file` 类型，并限制附件大小、清洗文件名。

### 6.4 消息上限

- 聊天页加载最近 50 条；
- 图片发送上限 10MB；
- 其他附件上限 30MB；
- 语音/视频按文件发送。

## 7. Client UI

### 7.1 Slot

- `sidebar.panellist`：id `feishu-client`，order 20，label「DSH飞书客户端」；
- `main`：key `feishu-client`。

### 7.2 视图

```text
view = empty | new | setup | chat
```

- `empty`：没有机器人时的引导页；
- `new`：添加飞书机器人；
- `setup`：机器人设置页；
- `chat`：聊天页。

### 7.3 主要状态

- `apps`、`selectedAppId`、`view`、`setupAppId`；
- `messages`、`messagesLoading`、`text`、`attachment`、`preview`；
- `auth`、`authLoading`、`authUrl`、`busy`、`binding`；
- `lastMeta`、`unread`、`showJump`、`pollError`；
- 滚动、轮询、OAuth 轮询和消息缓存 refs。

### 7.4 切换与缓存

- `auth` 按 app 缓存，配 `authLoading`，避免切换时误显示未授权；
- 消息按 `appId:chatId` 缓存，切换时先显示缓存，再后台刷新；
- 使用 `useLayoutEffect` 在绘制前瞬间定位到底部；
- 消息容器不使用平滑滚动，避免切换时出现滚动动画。

### 7.5 设置页

设置页分为两张卡片：

- 基本信息：名称、能力描述、标签、保存修改；
- 连接与授权：授权状态、授权/绑定/重新绑定/重新授权/测试/删除。

设置页不显示工具调用记录；右上角提供「返回」。

## 8. Agent 工具

### 8.1 工具列表

| 工具 | 作用 |
|---|---|
| `feishu_client_list` | 列出远端、能力描述、标签、授权/绑定、busy、最近调用结果 |
| `feishu_client_ask` | 向远端发送文本/图片/文件，等待结束或需要决策 |
| `feishu_client_continue` | 继续 pending / needs_approval / needs_answer 请求 |

### 8.2 远端选择

`feishu_client_ask` 的 `app` 支持：

- app id 精确匹配；
- 名称精确匹配且唯一；
- 未指定且只有一个远端时自动选择；
- 多个或无匹配时返回候选，由模型或用户选择。

`feishu_client_list` 支持按名称、描述、标签查询，并返回候选。

### 8.3 锁与并发

- 每个远端一个应用级锁；
- 同一远端同时只允许一个请求；
- 第二个请求返回 `busy` 和当前 `request_id`；
- 请求记录保存在 Host 内存，30 分钟 TTL；
- 插件卸载时取消所有等待并释放锁；进程重启后记录丢失。

### 8.4 状态机

```text
ask
  ├─ 未授权 / 未绑定 → error
  ├─ 锁被占用 → busy
  ├─ 发送消息/附件
  ├─ 等待 reaction 或新消息
  │    ├─ DONE → done
  │    ├─ ERROR → error
  │    ├─ 审批卡 → 本地审批 → 发批准/拒绝 → 继续
  │    ├─ 提问卡 → needs_answer
  │    └─ 超时 → pending
  └─ 收口后释放锁、更新 lastAsk
```

`feishu_client_continue`：

- `pending`：继续等待；
- `needs_answer`：把 answer 作为用户消息发回，继续等待；
- `needs_approval`：把 answer 规范为「批准/拒绝」发回，继续等待；
- 每次继续重置超时，但不超过请求 TTL。

### 8.5 完成判定

| 信号 | 含义 |
|---|---|
| `OnIt` | 远端已接管，继续等待 |
| `DONE` | 本轮成功结束 |
| `ERROR` | 本轮失败 |
| 曾经 `OnIt`、现在消失 | 远端取消 |
| 有助手消息且静默 `quietFallbackMs` | reaction 不可读时的静默兜底 |

只接受机器人身份贴的 reaction；轮询间隔默认 2000ms。超时默认 180 秒，最大 600 秒；超时返回 `pending` 和 `request_id`。

### 8.6 审批与提问

- 审批卡识别「批准/同意/allow/yes」和「拒绝/不同意/reject/deny/no」；
- 默认把审批桥接到本地审批 UI；
- 本地不批准时不发送批准，fail closed；
- `remoteApproval` 可配置为 `ask-local`、`model` 或 `deny`；
- 远端审批通常只有 5 分钟窗口，本地审批默认 4 分钟超时；
- 提问卡返回 `needs_answer`，通过 `feishu_client_continue` 回答。

### 8.7 附件

- 每次最多 4 个附件；
- 总计不超过 20MB；
- 单图片不超过 10MB；
- 单文件不超过 20MB；
- 文件默认写入 `<session cwd>/.dsh-feishu-client/inbox/`；
- 入站图片可作为 image 块返回，入站文件返回本地路径；
- 路径越界、文件不存在或超过限制会返回对应错误。

### 8.8 结果

收口结果包含：

- `status`、`request_id`、`duration_ms`；
- `reply` / `last_reply`；
- `completion`（reaction 或 quiet）；
- 审批/提问状态；
- 附件结果和 warning；
- 最近一次调用会写回 `apps.json` 的 `lastAsk`。

## 9. Host API

所有路径以 `/api/dsh-feishu-client` 为前缀。管理 API 需要 DSH 登录态；非 GET 请求额外要求：

```text
x-dsh-feishu-client: 1
```

OAuth 回调是唯一不依赖 DSH 登录态的 GET。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/state` | 应用列表和授权状态 |
| POST | `/apps` | 新建应用 |
| PATCH | `/apps/:id` | 修改名称/描述/标签 |
| DELETE | `/apps/:id` | 删除本地应用记录、授权引用和会话绑定 |
| POST | `/apps/:id/test` | 测试机器人、授权和绑定 |
| GET | `/apps/:id/oauth/start` | 生成授权 URL |
| GET | `/apps/:id/oauth/status` | 查询授权状态 |
| GET | `/oauth/callback` | OAuth 回调 |
| POST | `/apps/:id/discover-chat` | 发现单聊 |
| POST | `/apps/:id/chat` | 手动绑定单聊 |
| POST | `/apps/:id/media` | 上传媒体 |
| GET | `/apps/:id/messages` | 读取最近消息 |
| POST | `/apps/:id/messages` | 发送消息 |
| GET | `/apps/:id/messages/:messageId/resources/:fileKey` | 资源代理 |

## 10. 配置

配置通过 profile patch 生效：

```yaml
- id: cubeai-feishu-client
  config:
    stateDir: ''
    publicBaseUrl: ''
    desktopCallbackPort: 32123
    agentTools:
      enabled: true
      allowedApps: []
      defaultTimeoutSeconds: 180
      maxTimeoutSeconds: 600
      pollIntervalMs: 2000
      quietFallbackMs: 30000
      reactionGraceMs: 6000
      maxReplyChars: 12000
      maxMessageChars: 20000
      requireApprovalPerAsk: false
      remoteApproval: ask-local
      approvalTimeoutMs: 240000
      warnLocalConflict: true
      attachments:
        enabled: true
        maxCount: 4
        maxTotalBytes: 20971520
        maxImageBytes: 10485760
        maxFileBytes: 20971520
        allowOutsideWorkspace: false
        inboxDir: ''
```

说明：

- `stateDir` 为空时使用 `~/.dsh/dsh-feishu-client`；
- `publicBaseUrl` 用于 nginx 等路径前缀部署，可带路径，不要尾斜杠；
- `desktopCallbackPort` 是桌面版 OAuth 回调端口；
- `remoteApproval`：`ask-local`（默认）、`model`、`deny`；
- `allowedApps` 为空表示允许全部远端；
- `attachments.inboxDir` 为空时使用 `<session cwd>/.dsh-feishu-client/inbox/`。

## 11. 安全

- App Secret、用户 Token、refresh token 只存在于 DSH Credential Vault；
- Client 只访问同源 API，资源通过 Host 代理；
- OAuth 使用随机 state，回调路径精确匹配；
- 管理 API 复用 DSH 登录态和跨站校验；
- 非 GET 请求要求 `x-dsh-feishu-client: 1`；
- 资源代理只接受 `image`/`file`，限制大小并清洗文件名；
- Agent 工具默认把远端审批交回本地，不自动批准；
- 远端回复标记为外部内容，不作为指令执行；
- 如果本机也运行了同一个飞书机器人应用的飞书频道插件，会给出冲突提示。

## 12. 部署

### 12.1 根路径

默认 `http://127.0.0.1:3080/` 部署无需额外配置。

### 12.2 路径前缀

通过 nginx 挂载在路径下时，建议配置 `publicBaseUrl`：

```yaml
- id: cubeai-feishu-client
  config:
    publicBaseUrl: https://host.example.com/dsh
```

并确保：

```text
https://host.example.com/dsh/api/dsh-feishu-client/oauth/callback
```

已加入飞书机器人应用的安全设置。远端 `dsh-feishu-channels` 应自动写入新的 `/api/dsh-feishu-client/oauth/callback` 路径。

### 12.3 桌面版

Windows/Mac 桌面版的页面不是 http(s)，插件会启动本机回调服务：

```text
http://127.0.0.1:32123/api/dsh-feishu-client/oauth/callback
```

端口可通过 `desktopCallbackPort` 修改；修改后需要同步到飞书应用安全设置。

## 13. 限制与错误

主要限制：

- 一个飞书机器人应用只对应一个单聊；
- 不提供 p2p 会话列表，只能自动发现机器人与当前授权用户的单聊；
- 聊天页只加载最近 50 条；
- 原生语音/视频按文件处理；
- Agent 工具同一远端同时只能有一个请求；
- 进程重启后未完成的 Agent 请求会丢失，需要重新发起。

常见错误：

| 场景 | 处理 |
|---|---|
| `20027` | 检查飞书频道权限是否自动开通并生效 |
| `redirect_uri unmatch` | 确认回调地址与实际访问地址一致 |
| `20010` | 确认当前用户在应用可用范围内 |
| `99991677` | 授权过期，重新授权 |
| `99991679` | 缺少用户权限，重新授权 |
| `234006` | 附件超过飞书大小限制 |
| `attachment_too_large` | 调整附件或配置上限 |
| `attachment_denied` | 文件路径越界或不存在 |
| `busy` | 同一远端已有请求，稍后或使用 `feishu_client_continue` |
| `request_not_found` | 请求已过期，重新 `feishu_client_ask` |

## 14. 开发与测试

- 无构建步骤，`lib/index.js` 和 `lib/client.js` 直接作为插件产物；
- 修改 Client 后硬刷新页面；修改 Host 后重新加载插件或重启 DSH；
- 单元测试：

```bash
node --test test/*.test.js
```

当前 34 项测试覆盖消息归一化、reaction、审批、时钟偏差、同 ID 卡片更新、Agent 工具状态机、路径前缀、桌面回调和远端冲突检测。
