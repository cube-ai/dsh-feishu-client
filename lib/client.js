window.__ModuleLoader__.load({
  id: '@cubeai/dsh-feishu-client',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useLayoutEffect, useRef, useState } = React

    const BASE = (() => {
      const fallback = typeof window !== 'undefined' ? window.location.origin : ''
      try {
        const injected = typeof window !== 'undefined' ? window.__DSH_FEISHU_CLIENT_BASE__ : ''
        const raw = injected || (typeof document !== 'undefined' ? document.baseURI : '') || fallback
        const parsed = new URL(raw, fallback || undefined)
        const pathname = parsed.pathname.replace(/\/+$/, '')
        return `${parsed.origin}${pathname}`
      } catch {
        return fallback
      }
    })()
    const API = (() => {
      try {
        return new URL('api/dsh-feishu-client', `${BASE}/`).pathname.replace(/\/$/, '')
      } catch {
        return '/api/dsh-feishu-client'
      }
    })()
    const PANEL_ID = 'feishu-client'
    const LS_APP = 'dsh-feishu-client:app'
    const LS_LAST = 'dsh-feishu-client:last'
    const draftKey = (id) => `dsh-feishu-client:draft:${id}`

    const css = `
.rf-root{height:100%;min-height:0;display:flex;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.5}
.rf-root *{box-sizing:border-box}
.rf-root button{font:inherit}
.rf-root a{color:var(--dsw-alias-brand-primary)}
.rf-side{width:280px;flex:0 0 280px;min-height:0;display:flex;flex-direction:column;border-right:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.rf-side-head{padding:14px 12px 16px}
.rf-side-title{padding:0 4px 8px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-tertiary,#8f959e);letter-spacing:.02em}
.rf-list{flex:1;min-height:0;overflow:auto;padding:0 8px 14px;display:flex;flex-direction:column;gap:3px}
.rf-side-hint{padding:12px 10px;color:var(--dsw-alias-label-tertiary,#8f959e);font-size:12px;line-height:1.7;white-space:pre-wrap}
.rf-bot{display:flex;align-items:center;gap:9px;width:100%;padding:8px 9px;border:0;border-radius:9px;background:transparent;color:inherit;text-align:left;cursor:pointer}
.rf-bot:hover{background:var(--dsw-alias-interactive-bg-hover,#00000008)}
.rf-bot.active{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,var(--dsw-alias-bg-layer-1));box-shadow:inset 3px 0 0 var(--dsw-alias-brand-primary)}
.rf-bot.active .rf-bot-name{font-weight:700}
.rf-bot.active .rf-bot-preview{color:var(--dsw-alias-label-secondary)}
.rf-bot-avatar{width:30px;height:30px;flex:0 0 30px;border-radius:9px;display:grid;place-items:center;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,var(--dsw-alias-bg-layer-2));color:var(--dsw-alias-label-secondary);font-weight:650;font-size:12px}
.rf-bot-main{flex:1;min-width:0}
.rf-bot-name{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rf-bot-preview{margin-top:2px;font-size:12px;color:var(--dsw-alias-label-tertiary,#8f959e);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rf-bot-side{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex:0 0 auto}
.rf-bot-time{font-size:11px;color:var(--dsw-alias-label-tertiary,#8f959e)}
.rf-dot{width:7px;height:7px;border-radius:50%;display:inline-block;background:var(--dsw-alias-state-idle-primary)}
.rf-dot.ok{background:var(--dsw-alias-state-success-primary)}
.rf-dot.warn{background:var(--dsw-alias-state-warn-primary)}
.rf-dot.err{background:var(--dsw-alias-state-error-primary)}
.rf-main{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.rf-body{flex:1;min-height:0;overflow:auto;padding:22px}
.rf-banner{display:flex;align-items:flex-start;gap:10px;margin:10px 16px 0;padding:9px 12px;border-radius:9px;font-size:12px;line-height:1.6;white-space:pre-wrap;flex-shrink:0}
.rf-banner.error{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 11%,transparent);color:var(--dsw-alias-state-error-primary)}
.rf-banner.success{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 11%,transparent);color:var(--dsw-alias-state-success-primary)}
.rf-banner.warn{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 13%,transparent);color:var(--dsw-alias-state-warn-primary)}
.rf-banner-text{flex:1;min-width:0}
.rf-banner-close{border:0;background:transparent;color:inherit;cursor:pointer;font-size:15px;line-height:1;padding:0 2px;opacity:.7}
.rf-banner-close:hover{opacity:1}
.rf-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:30px;padding:0 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;white-space:nowrap;transition:background .12s ease,border-color .12s ease}
.rf-btn:hover{background:var(--dsw-alias-interactive-bg-hover,#00000008)}
.rf-btn.primary{border-color:transparent;background:var(--dsw-alias-brand-primary);color:#fff}
.rf-btn.ghost{background:transparent;font-size:14px;border-color:var(--dsw-alias-border-l2)}
.rf-btn.ghost:hover{background:var(--dsw-alias-interactive-bg-hover,#00000008)}
.rf-btn.primary:hover{filter:brightness(1.04)}
.rf-btn.danger{color:var(--dsw-alias-state-error-primary)}
.rf-btn.danger:hover{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent)}
.rf-btn:disabled{opacity:.45;cursor:not-allowed}
.rf-btn.block{width:100%;height:34px}
.rf-link{border:0;background:transparent;color:var(--dsw-alias-brand-primary);cursor:pointer;padding:0;font:inherit;text-decoration:underline}
.rf-chat{flex:1;min-height:0;display:flex;flex-direction:column}
.rf-chat-header{display:flex;align-items:center;gap:11px;padding:12px 20px;border-bottom:1px solid var(--dsw-alias-border-l1);min-height:64px;flex-shrink:0}
.rf-avatar{width:28px;height:28px;flex:0 0 28px;border-radius:9px;display:grid;place-items:center;font-size:11px;font-weight:650;color:var(--dsw-alias-label-secondary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,var(--dsw-alias-bg-layer-2))}
.rf-avatar.me{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}
.rf-chat-title-wrap{flex:1;min-width:0}
.rf-chat-title{font-size:15px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rf-chat-sub{display:flex;align-items:center;gap:6px;margin-top:2px;font-size:11px;color:var(--dsw-alias-label-tertiary,#8f959e);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rf-chat-sub .rf-dot{flex:0 0 7px}
.rf-mono{font-family:var(--dsw-font-mono,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:10.5px;opacity:.85;overflow:hidden;text-overflow:ellipsis;max-width:180px}
.rf-chat-actions{position:relative;display:flex;align-items:center;gap:6px;flex-wrap:nowrap;justify-content:flex-end}
.rf-more-btn{width:36px;height:36px;padding:0;font-size:22px;line-height:1;letter-spacing:0;background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l2)}
.rf-menu{position:absolute;top:calc(100% + 6px);right:0;z-index:60;min-width:172px;padding:4px;display:flex;flex-direction:column;gap:1px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-1));box-shadow:0 12px 32px rgba(0,0,0,.18)}
.rf-menu-item{display:flex;align-items:center;width:100%;height:32px;padding:0 10px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:32px;text-align:left;white-space:nowrap;cursor:pointer}
.rf-menu-item:hover{background:var(--dsw-alias-interactive-bg-hover,#00000008)}
.rf-menu-item:disabled{opacity:.45;cursor:not-allowed}
.rf-menu-item.danger{color:var(--dsw-alias-state-error-primary)}
.rf-menu-item.danger:hover{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent)}
.rf-menu-sep{height:1px;margin:4px 6px;background:var(--dsw-alias-border-l1)}
.rf-chat-body{flex:1;min-height:0;display:flex;flex-direction:column;position:relative}
.rf-messages{flex:1;min-height:0;overflow:auto;padding:18px 24px 10px;display:flex;flex-direction:column;gap:10px}
.rf-messages-empty{padding:0 24px}
.rf-day{align-self:center;font-size:11px;color:var(--dsw-alias-label-tertiary,#8f959e);padding:10px 0 2px}
.rf-row{display:flex;align-items:flex-start;gap:9px;max-width:100%}
.rf-row.user{justify-content:flex-end}
.rf-msg-main{min-width:0;max-width:min(720px,82%);display:flex;flex-direction:column}
.rf-row.user .rf-msg-main{align-items:flex-end}
.rf-msg-meta{font-size:10.5px;color:var(--dsw-alias-label-tertiary,#8f959e);margin:0 2px 3px}
.rf-bubble{border-radius:13px;padding:9px 12px;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;font-size:13px;line-height:1.58}
.rf-bubble.assistant{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-top-left-radius:5px}
.rf-bubble.user{background:var(--dsw-specific-bubble,var(--dsw-alias-bg-layer-2));color:var(--dsw-alias-label-primary);border:0;border-radius:var(--dsw-radius-xl,14px);padding:10px 16px;font-size:var(--dsh-content-font-size,14px);line-height:calc(22px + var(--dsh-content-font-delta,0px))}
.rf-attachments{display:flex;flex-direction:column;gap:8px;margin-top:8px;min-width:0}
.rf-bubble>.rf-attachments:first-child{margin-top:0}
.rf-attachment-image{display:block;max-width:100%;padding:0;border:0;background:transparent;cursor:zoom-in;border-radius:var(--dsw-radius-md,8px);overflow:hidden;text-align:left}
.rf-attachment-image img{display:block;width:auto;max-width:min(340px,100%);max-height:280px;object-fit:contain;border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-2)}
.rf-attachment-error{display:flex;align-items:center;gap:10px;padding:9px 10px;border:1px dashed var(--dsw-alias-border-l2);border-radius:8px;color:var(--dsw-alias-label-tertiary,#8f959e);font-size:12px}
.rf-attachment-error a{font-size:12px}
.rf-attachment-media{display:flex;flex-direction:column;gap:5px;min-width:0}
.rf-attachment-media audio{display:block;width:min(320px,100%);max-width:100%}
.rf-attachment-media video{display:block;width:auto;max-width:min(420px,100%);max-height:300px;border-radius:var(--dsw-radius-md,8px);background:#000}
.rf-attachment-caption{display:flex;align-items:center;gap:5px;min-width:0;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary,#8f959e)}
.rf-attachment-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rf-attachment-download{flex:none;margin-left:auto;color:var(--dsw-alias-brand-primary);text-decoration:none;font-size:11px}
.rf-attachment-download:hover{text-decoration:underline}
.rf-attachment-file{display:flex;align-items:center;gap:9px;max-width:min(380px,100%);padding:9px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-2)}
.rf-file-icon{width:34px;height:34px;flex:0 0 34px;display:grid;place-items:center;border-radius:7px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);color:var(--dsw-alias-brand-primary);font:600 9px/1 var(--dsw-font-family,inherit);letter-spacing:.02em;overflow:hidden}
.rf-file-main{flex:1;min-width:0}
.rf-file-name{font-size:12px;font-weight:600;line-height:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rf-file-meta{font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-tertiary,#8f959e)}
.rf-file-actions{display:flex;align-items:center;gap:5px;flex:none}
.rf-file-btn{display:inline-flex;align-items:center;justify-content:center;height:24px;padding:0 7px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;line-height:22px;text-decoration:none;white-space:nowrap}
.rf-file-btn:hover{background:var(--dsw-alias-interactive-bg-hover,#00000008);color:var(--dsw-alias-label-primary)}
.rf-file-btn.primary{border-color:transparent;background:var(--dsw-alias-brand-primary);color:#fff}
.rf-file-btn.primary:hover{filter:brightness(1.04)}
.rf-system{align-self:center;max-width:80%;text-align:center;font-size:11.5px;color:var(--dsw-alias-label-tertiary,#8f959e);background:var(--dsw-alias-bg-layer-2);border-radius:999px;padding:4px 10px}
.rf-md{min-width:0}
.rf-md .rf-p{margin:0 0 4px}
.rf-md .rf-p:last-child{margin-bottom:0}
.rf-md h1,.rf-md h2,.rf-md h3{margin:10px 0 5px;font-weight:650;line-height:1.35}
.rf-md .rf-h1{font-size:16px}.rf-md .rf-h2{font-size:14.5px}.rf-md .rf-h3{font-size:13.5px}
.rf-md ul,.rf-md ol{margin:4px 0;padding-left:20px}
.rf-md li{margin:2px 0}
.rf-md blockquote{margin:6px 0;padding:2px 0 2px 10px;border-left:2px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);white-space:pre-wrap}
.rf-md hr{border:0;border-top:1px solid var(--dsw-alias-border-l1);margin:10px 0}
.rf-md code{font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:.875em;background:var(--dsw-alias-markdown-inline-code,var(--dsw-alias-bg-layer-2));border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm,6px);padding:0 5px;box-decoration-break:clone}
.rf-md .rf-pre{margin:6px 0;padding:10px 12px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);overflow:auto;max-width:100%}
.rf-md .rf-pre code{background:transparent;padding:0;font-size:12px;line-height:1.55;white-space:pre}
.rf-code{margin:12px 0;border-radius:var(--dsw-radius-lg,10px);background:var(--dsw-alias-markdown-code-block,var(--dsw-alias-bg-layer-2));color:var(--dsw-alias-label-primary);overflow:hidden;max-width:100%}
.rf-code-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 10px 6px 12px;background:var(--dsw-alias-markdown-code-block-banner,var(--dsw-alias-markdown-code-block,var(--dsw-alias-bg-layer-2)));color:var(--dsw-alias-label-secondary);font-size:11px;line-height:18px;user-select:none}
.rf-code-lang{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary,#8f959e);font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11px}
.rf-code-actions{display:flex;align-items:center;gap:2px;flex:none}
.rf-code-btn{height:24px;padding:0 8px;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;line-height:24px;cursor:pointer;white-space:nowrap}
.rf-code-btn:hover{background:var(--dsw-alias-interactive-bg-hover,#00000008);color:var(--dsw-alias-label-primary)}
.rf-code-btn:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}
.rf-code-btn[aria-pressed="true"]{color:var(--dsw-alias-label-primary)}
.rf-code-body{overflow:auto;padding:8px 12px 12px;max-width:100%}
.rf-code-pre{margin:0;font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:var(--dsh-code-font-size,11px);line-height:calc(19px + var(--dsh-code-font-delta,0px));color:var(--dsw-alias-label-primary);tab-size:2;white-space:normal}
.rf-code-line{min-height:1lh;white-space:pre}
.rf-code[data-wrap="true"] .rf-code-line{white-space:pre-wrap;overflow-wrap:anywhere}
.rf-tok-kw{color:var(--shiki-token-keyword,#d6336c)}
.rf-tok-str{color:var(--shiki-token-string,#2f9e44)}
.rf-tok-com{color:var(--shiki-token-comment,#868e96);font-style:italic}
.rf-tok-num{color:var(--shiki-token-constant,#1c7ed6)}
.rf-tok-fn{color:var(--shiki-token-function,#6741d9)}
.rf-tok-type{color:var(--shiki-token-constant,#1c7ed6)}
.rf-tok-param{color:var(--shiki-token-parameter,#e8590c)}
.rf-tok-prop{color:var(--shiki-token-parameter,#e8590c)}
.rf-tok-punc{color:var(--shiki-token-punctuation,#495057)}
.rf-tok-tag{color:var(--shiki-token-keyword,#d6336c)}
.rf-tok-attr{color:var(--shiki-token-parameter,#e8590c)}
.rf-tok-meta{color:var(--dsw-alias-label-tertiary,#8f959e)}
.rf-tok-add{color:var(--dsw-alias-state-success-primary,#2f9e44);background:var(--dsw-alias-code-diff-added,transparent)}
.rf-tok-del{color:var(--dsw-alias-state-error-primary,#e03131);background:var(--dsw-alias-code-diff-deleted,transparent)}

.rf-md .rf-table-wrap{max-width:100%;overflow:auto;margin:7px 0;border:1px solid var(--dsw-alias-border-l1);border-radius:8px}
.rf-md table{border-collapse:collapse;min-width:100%;font-size:12px}
.rf-md th,.rf-md td{border-right:1px solid var(--dsw-alias-border-l1);border-bottom:1px solid var(--dsw-alias-border-l1);padding:5px 8px;text-align:left;vertical-align:top;white-space:nowrap}
.rf-md th{background:var(--dsw-alias-bg-layer-2);font-weight:650}
.rf-md tr:last-child td{border-bottom:0}
.rf-md th:last-child,.rf-md td:last-child{border-right:0}
.rf-md a{text-decoration:none}
.rf-md a:hover{text-decoration:underline}
.rf-typing{display:flex;align-items:center;gap:4px;padding:12px 14px}
.rf-typing-dot{width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-label-tertiary,#8f959e);animation:rf-blink 1.2s infinite ease-in-out}
.rf-typing-dot:nth-child(2){animation-delay:.15s}
.rf-typing-dot:nth-child(3){animation-delay:.3s}
@keyframes rf-blink{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-2px)}}
.rf-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}
.rf-action{height:26px;padding:0 10px;border-radius:7px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}
.rf-action:hover{background:var(--dsw-alias-interactive-bg-hover,#00000008)}
.rf-action.used{opacity:.55;cursor:default}
.rf-approval-inline{margin-top:9px;padding:10px 12px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary) 42%,var(--dsw-alias-border-l1));border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 9%,var(--dsw-alias-bg-layer-1));max-width:100%}
.rf-approval-head{display:flex;align-items:flex-start;gap:8px;min-width:0}
.rf-approval-copy{min-width:0}
.rf-approval-icon{width:22px;height:22px;flex:0 0 22px;display:grid;place-items:center;border-radius:50%;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 18%,transparent);color:var(--dsw-alias-state-warn-primary);font:700 13px/1 var(--dsw-font-family,inherit)}
.rf-approval-title{font-size:12px;font-weight:700;line-height:18px;color:var(--dsw-alias-label-primary)}
.rf-approval-desc{font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-secondary)}
.rf-approval-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px}
.rf-approval-btn{height:34px;min-width:104px;padding:0 16px;border-radius:8px;border:1px solid transparent;font:inherit;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}
.rf-approval-btn.approve{background:var(--dsw-alias-state-success-primary);color:#fff}
.rf-approval-btn.approve:hover{filter:brightness(1.05)}
.rf-approval-btn.reject{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,var(--dsw-alias-bg-base));color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 45%,var(--dsw-alias-border-l1))}
.rf-approval-btn.reject:hover{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 18%,var(--dsw-alias-bg-base))}
.rf-approval-btn:disabled{opacity:.45;cursor:default;filter:none}
.rf-jump{position:absolute;left:50%;bottom:92px;transform:translateX(-50%);z-index:4;height:28px;padding:0 12px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);box-shadow:0 4px 14px rgba(0,0,0,.12);font:inherit;font-size:12px;cursor:pointer}
.rf-jump:hover{background:var(--dsw-alias-interactive-bg-hover,#00000008)}
.rf-composer{padding:10px 20px 16px;flex-shrink:0}
.rf-auth-hint{margin-bottom:8px;padding:8px 11px;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 12%,transparent);color:var(--dsw-alias-state-warn-primary);font-size:12px}
.rf-composer-card{border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1);padding:8px 10px 7px;display:flex;flex-direction:column;gap:5px;box-shadow:0 1px 2px rgba(0,0,0,.03)}
.rf-composer-card:focus-within{border-color:var(--dsw-alias-brand-primary)}
.rf-composer-left{display:flex;align-items:center;gap:7px;min-width:0}
.rf-attach-btn{flex:none;width:26px;height:26px;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);font:inherit;font-size:15px;line-height:24px;cursor:pointer}
.rf-attach-btn:hover{background:var(--dsw-alias-interactive-bg-hover,#00000008);color:var(--dsw-alias-label-primary)}
.rf-attach-btn:disabled{opacity:.45;cursor:not-allowed}
.rf-composer-attachment{display:flex;align-items:center;gap:9px;padding:7px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-2);min-width:0}
.rf-composer-attachment-thumb{width:34px;height:34px;flex:0 0 34px;border-radius:7px;object-fit:cover;background:var(--dsw-alias-bg-base)}
.rf-composer-attachment-thumb.file{display:grid;place-items:center;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary,#8f959e);font:600 9px/1 var(--dsw-font-family,inherit);overflow:hidden}
.rf-composer-attachment-main{flex:1;min-width:0}
.rf-composer-attachment-name{font-size:12px;line-height:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rf-composer-attachment-meta{font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-tertiary,#8f959e)}
.rf-composer-attachment-remove{flex:none;width:22px;height:22px;padding:0;border:0;border-radius:5px;background:transparent;color:var(--dsw-alias-label-tertiary,#8f959e);font:inherit;font-size:16px;line-height:20px;cursor:pointer}
.rf-composer-attachment-remove:hover{background:var(--dsw-alias-interactive-bg-hover,#00000008);color:var(--dsw-alias-label-primary)}
.rf-composer-attachment-remove:disabled{opacity:.45;cursor:not-allowed}
.rf-textarea{width:100%;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:1.55;resize:none;outline:none;min-height:24px;max-height:140px;padding:2px 1px}
.rf-textarea::placeholder{color:var(--dsw-alias-label-tertiary,#8f959e)}
.rf-composer-bar{display:flex;align-items:center;justify-content:space-between;gap:10px}
.rf-composer-hint{font-size:11px;color:var(--dsw-alias-label-tertiary,#8f959e);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rf-empty-wrap{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:28px}
.rf-empty{display:flex;flex-direction:column;align-items:center;text-align:center;gap:9px;max-width:460px}
.rf-empty-art{width:64px;height:64px;border-radius:18px;display:grid;place-items:center;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);color:var(--dsw-alias-brand-primary);margin-bottom:4px}
.rf-empty-title{font-size:17px;font-weight:650}
.rf-empty-desc{font-size:12.5px;color:var(--dsw-alias-label-secondary);line-height:1.7}
.rf-chat-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;text-align:center;padding:30px}
.rf-chat-empty-title{font-size:15px;font-weight:650}
.rf-chat-empty-desc{font-size:12.5px;color:var(--dsw-alias-label-secondary);max-width:380px;line-height:1.7}
.rf-skeleton{padding:22px 24px;display:flex;flex-direction:column;gap:12px}
.rf-skeleton-row{height:38px;border-radius:10px;background:linear-gradient(90deg,var(--dsw-alias-bg-layer-1),var(--dsw-alias-bg-layer-2),var(--dsw-alias-bg-layer-1));background-size:200% 100%;animation:rf-shine 1.4s infinite linear;max-width:460px}
.rf-skeleton-row.right{align-self:flex-end;max-width:320px}
@keyframes rf-shine{0%{background-position:200% 0}100%{background-position:-200% 0}}
.rf-form-wrap{max-width:660px;margin:0 auto;padding:4px 0 24px}
.rf-form-card,.rf-setup-card{border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);padding:22px 24px;display:flex;flex-direction:column;gap:15px}
.rf-form-title{font-size:18px;font-weight:650;margin:0}
.rf-form-desc{font-size:12.5px;color:var(--dsw-alias-label-secondary);line-height:1.7;margin-top:4px}
.rf-field{display:flex;flex-direction:column;gap:6px}
.rf-label{font-size:12px;font-weight:600}
.rf-hint{font-size:11.5px;color:var(--dsw-alias-label-tertiary,#8f959e);line-height:1.6}
.rf-input,.rf-select{width:100%;height:34px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);padding:0 10px;font:inherit;outline:none}
.rf-input:focus,.rf-select:focus{border-color:var(--dsw-alias-brand-primary)}
.rf-field textarea.rf-input{height:auto;min-height:76px;padding:8px 10px;resize:vertical;line-height:1.6}
.rf-input-wrap{display:flex;gap:6px}
.rf-input-wrap .rf-input{flex:1}
.rf-details{font-size:12px;color:var(--dsw-alias-label-secondary)}
.rf-details summary{cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:12px}
.rf-details p,.rf-details ol{margin:6px 0 0;line-height:1.7;padding-left:18px}
.rf-form-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:2px}
.rf-alert{padding:9px 12px;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 11%,transparent);color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:1.6;white-space:pre-wrap}
.rf-spinner{width:13px;height:13px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:rf-spin .7s linear infinite;display:inline-block}
@keyframes rf-spin{to{transform:rotate(360deg)}}
.rf-tabs{display:flex;gap:4px;padding:3px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);align-self:flex-start}
.rf-tab{height:28px;padding:0 12px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}
.rf-tab.active{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);box-shadow:0 1px 2px rgba(0,0,0,.06)}
.rf-prep{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-2);padding:12px 14px;font-size:12px;line-height:1.65}
.rf-prep-title{font-weight:650;margin-bottom:4px}
.rf-prep-list{margin:0;padding-left:18px}
.rf-prep-list li{margin:3px 0}
.rf-prep code{font-family:var(--dsw-font-mono,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11px;background:var(--dsw-alias-bg-base);border-radius:4px;padding:1px 4px}
.rf-setup{max-width:720px;margin:0 auto;padding:4px 0 24px;display:flex;flex-direction:column;gap:14px}
.rf-setup-head-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;width:100%}
.rf-setup-head-main{min-width:0;flex:1}
.rf-setup-card-head{display:flex;flex-direction:column;gap:2px}
.rf-setup-card-title{font-size:13px;font-weight:650}
.rf-setup-card-desc{font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary)}
.rf-setup-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid var(--dsw-alias-border-l1);padding-top:12px;margin-top:2px}
.rf-setup-footer .rf-hint{text-align:right}
.rf-setup-head{display:flex;align-items:flex-start;flex-direction:column;gap:3px}
.rf-setup-title{font-size:18px;font-weight:650;margin:0}
.rf-setup-sub{font-size:12px;color:var(--dsw-alias-label-tertiary,#8f959e)}
.rf-steps{display:flex;flex-direction:column;gap:9px}
.rf-step{display:flex;align-items:flex-start;gap:10px}
.rf-step-index{width:22px;height:22px;flex:0 0 22px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:650;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l1)}
.rf-step.done .rf-step-index{background:var(--dsw-alias-state-success-primary);border-color:transparent;color:#fff}
.rf-step.current .rf-step-index{background:var(--dsw-alias-brand-primary);border-color:transparent;color:#fff}
.rf-step-main{min-width:0}
.rf-step-title{font-weight:600}
.rf-step-desc{font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.6;margin-top:1px}
.rf-name{display:flex;flex-direction:column;gap:6px}
.rf-name-row{display:flex;gap:8px;align-items:center}
.rf-name-row .rf-input{flex:1}
.rf-setup-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.rf-binding{display:flex;align-items:center;gap:8px;color:var(--dsw-alias-label-secondary);font-size:12px}
.rf-manual{margin-top:2px}
.rf-manual-row{display:flex;gap:8px;margin-top:8px}
.rf-manual-row .rf-input{flex:1}
.rf-media-overlay{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.66)}
.rf-media-dialog{width:min(100%,1000px);max-height:92vh;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-1));box-shadow:0 24px 80px rgba(0,0,0,.35)}
.rf-media-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 12px 9px 16px;border-bottom:1px solid var(--dsw-alias-border-l1);flex-shrink:0}
.rf-media-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:600}
.rf-media-actions{display:flex;align-items:center;gap:8px;flex:none}
.rf-media-download{display:inline-flex;align-items:center;height:26px;padding:0 9px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);font-size:12px;text-decoration:none}
.rf-media-download:hover{background:var(--dsw-alias-interactive-bg-hover,#00000008);color:var(--dsw-alias-label-primary)}
.rf-media-close{width:26px;height:26px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:20px;line-height:24px;cursor:pointer}
.rf-media-close:hover{background:var(--dsw-alias-interactive-bg-hover,#00000008);color:var(--dsw-alias-label-primary)}
.rf-media-body{min-height:0;overflow:auto;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-base)}
.rf-media-body img{display:block;max-width:100%;max-height:calc(92vh - 58px);object-fit:contain}
.rf-media-body video{display:block;max-width:100%;max-height:calc(92vh - 58px);background:#000}
.rf-media-body audio{width:min(560px,80vw);margin:32px}
@media (max-width:820px){.rf-side{width:230px;flex-basis:230px}.rf-chat-header{padding:10px 14px}.rf-messages{padding:14px 16px 8px}.rf-composer{padding:8px 14px 14px}.rf-body{padding:14px}.rf-form-card,.rf-setup-card{padding:18px}.rf-chat-actions .rf-btn{padding:0 9px}.rf-mono{max-width:110px}}
@media (max-width:620px){.rf-side{width:196px;flex-basis:196px}.rf-bot-preview{display:none}.rf-chat-sub{flex-wrap:wrap;white-space:normal}.rf-chat-header{flex-wrap:wrap}.rf-chat-title-wrap{flex:1 1 150px}.rf-chat-actions{display:flex;gap:4px}.rf-chat-actions .rf-btn{padding:0 7px;height:28px;font-size:12px}}
`

    function readLocal(key, fallback) {
      try {
        if (typeof localStorage === 'undefined') return fallback
        const raw = localStorage.getItem(key)
        return raw === null ? fallback : JSON.parse(raw)
      } catch { return fallback }
    }

    function writeLocal(key, value) {
      try {
        if (typeof localStorage === 'undefined') return
        localStorage.setItem(key, JSON.stringify(value))
      } catch { }
    }

    function readString(key) {
      try {
        if (typeof localStorage === 'undefined') return ''
        return localStorage.getItem(key) ?? ''
      } catch { return '' }
    }

    async function api(path, options = {}) {
      const headers = {
        'x-dsh-feishu-client': '1',
        ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(options.headers ?? {}),
      }
      const response = await fetch(`${API}${path}`, {
        credentials: 'same-origin',
        ...options,
        headers,
      })
      let data = null
      try { data = await response.json() } catch { }
      if (!response.ok || !data || data.ok === false) {
        throw new Error(data?.error ?? `请求失败（HTTP ${response.status}）`)
      }
      return data
    }

    function formatTime(value) {
      const date = new Date(Number(value))
      if (Number.isNaN(date.getTime())) return ''
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }

    function formatShort(value) {
      const date = new Date(Number(value))
      if (Number.isNaN(date.getTime())) return ''
      const now = new Date()
      return date.toDateString() === now.toDateString() ? formatTime(value) : `${date.getMonth() + 1}/${date.getDate()}`
    }

    function formatDay(value) {
      const date = new Date(Number(value))
      const now = new Date()
      const yesterday = new Date(now)
      yesterday.setDate(now.getDate() - 1)
      if (date.toDateString() === now.toDateString()) return '今天'
      if (date.toDateString() === yesterday.toDateString()) return '昨天'
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
    }

    function dayKey(value) {
      const date = new Date(Number(value))
      return Number.isNaN(date.getTime()) ? 'unknown' : date.toDateString()
    }

    function messageFingerprint(message) {
      try {
        return JSON.stringify({
          role: message.role,
          text: message.text,
          kind: message.kind,
          actions: message.actions ?? null,
          choices: message.choices ?? null,
          attachments: message.attachments ?? null,
          createdAt: message.createdAt,
        })
      } catch {
        return ''
      }
    }

    function mergeById(current, incoming) {
      const map = new Map(current.map((message) => [message.id, message]))
      let changed = false
      for (const message of incoming ?? []) {
        if (!message?.id) continue
        const previous = map.get(message.id)
        if (!previous) {
          changed = true
          map.set(message.id, message)
          continue
        }
        if (messageFingerprint(previous) !== messageFingerprint(message)) {
          changed = true
          map.set(message.id, message)
        }
      }
      if (!changed && map.size === current.length) return current
      return [...map.values()].sort((left, right) => left.createdAt - right.createdAt)
    }

    function mergeOne(current, message) {
      return mergeById(current, message ? [message] : [])
    }

    const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'tiff', 'heic', 'svg'])
    const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'opus', 'm4a', 'aac', 'flac', 'amr', 'wma'])
    const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v', 'flv', 'wmv'])

    function fileExtension(name) {
      const value = String(name ?? '').trim()
      const index = value.lastIndexOf('.')
      if (index < 0 || index === value.length - 1) return ''
      return value.slice(index + 1).toUpperCase().slice(0, 5)
    }

    function attachmentKindFromFile(file) {
      const mime = String(file?.type ?? '').toLowerCase()
      if (mime.startsWith('image/') && mime !== 'image/svg+xml') return 'image'
      if (mime.startsWith('audio/')) return 'audio'
      if (mime.startsWith('video/')) return 'video'
      const ext = fileExtension(file?.name).toLowerCase()
      if (ext !== 'svg' && IMAGE_EXTENSIONS.has(ext)) return 'image'
      if (AUDIO_EXTENSIONS.has(ext)) return 'audio'
      if (VIDEO_EXTENSIONS.has(ext)) return 'video'
      return 'file'
    }

    function formatBytes(value) {
      const bytes = Number(value) || 0
      if (!bytes) return ''
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    function formatDuration(value) {
      const ms = Number(value) || 0
      if (!ms) return ''
      const seconds = Math.max(0, Math.round(ms / 1000))
      return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
    }

    function resourceUrl(appId, messageId, attachment, download = false) {
      const fileKey = attachment?.fileKey || attachment?.imageKey
      if (!fileKey || !messageId) return ''
      const type = attachment.resourceType || (attachment.kind === 'image' ? 'image' : 'file')
      const query = new URLSearchParams({ type })
      if (download) {
        query.set('download', '1')
        if (attachment.name) query.set('name', attachment.name)
      }
      return `${API}/apps/${encodeURIComponent(appId)}/messages/${encodeURIComponent(messageId)}/resources/${encodeURIComponent(fileKey)}?${query.toString()}`
    }

    function statusOf(auth) {
      if (!auth) return { tone: '', label: '未授权' }
      if (auth.error) return { tone: 'err', label: '授权异常' }
      if (auth.warning) return { tone: 'warn', label: '权限不完整' }
      if (auth.authorized) return { tone: 'ok', label: '已授权' }
      return { tone: 'warn', label: '未授权' }
    }

    function actionKey(message, action, index) {
      return `${message.id}:${action.index !== undefined ? action.index : `u${index}`}`
    }

    function isApprovalAction(action) {
      const text = String(action?.text ?? '').trim()
      if (text === '批准' || text === '拒绝') return true
      const label = String(action?.label ?? '').trim()
      return /批准|同意|allow|^yes$|^y$/i.test(label) || /拒绝|不同意|reject|deny|^no$|^n$/i.test(label)
    }

    function isExpiredMessage(message) {
      return /已失效|已结束/.test(String(message?.text ?? ''))
    }

    function isVerdictText(value) {
      return /^(批准|同意|拒绝|不同意|allow|yes|y|reject|deny|no|n)$/i.test(String(value ?? '').trim())
    }

    function approvalActionValue(action) {
      const text = String(action?.text ?? '').trim()
      if (text === '批准' || text === '拒绝') return text
      const label = String(action?.label ?? '').trim()
      if (/批准|同意|allow|^yes$|^y$/i.test(label)) return '批准'
      if (/拒绝|不同意|reject|deny|^no$|^n$/i.test(label)) return '拒绝'
      return ''
    }

    function splitTableRow(line) {
      let value = String(line).trim()
      if (value.startsWith('|')) value = value.slice(1)
      if (value.endsWith('|')) value = value.slice(0, -1)
      return value.split('|').map((cell) => cell.trim())
    }

    function isTableSeparator(line) {
      return line.includes('|') && /^[\s|:-]+$/.test(line) && line.includes('-')
    }

    function renderInline(text) {
      const value = String(text ?? '')
      const nodes = []
      const pattern = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|~~[^~]+~~|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g
      let last = 0
      let match
      let key = 0
      while ((match = pattern.exec(value)) !== null) {
        if (match.index > last) nodes.push(value.slice(last, match.index))
        const token = match[0]
        if (token.startsWith('`')) nodes.push(h('code', { key: `c${key++}` }, token.slice(1, -1)))
        else if (token.startsWith('**') || token.startsWith('__')) nodes.push(h('strong', { key: `b${key++}` }, token.slice(2, -2)))
        else if (token.startsWith('~~')) nodes.push(h('del', { key: `d${key++}` }, token.slice(2, -2)))
        else if (token.startsWith('*') || token.startsWith('_')) nodes.push(h('em', { key: `i${key++}` }, token.slice(1, -1)))
        else {
          const link = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(token)
          if (link) nodes.push(h('a', { key: `a${key++}`, href: link[2], target: '_blank', rel: 'noreferrer' }, link[1]))
          else nodes.push(token)
        }
        last = pattern.lastIndex
      }
      if (last < value.length) nodes.push(value.slice(last))
      return nodes
    }

    const CODE_LANG_LABELS = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      json: 'JSON',
      python: 'Python',
      shell: 'Shell',
      powershell: 'PowerShell',
      html: 'HTML',
      xml: 'XML',
      css: 'CSS',
      scss: 'SCSS',
      less: 'Less',
      sql: 'SQL',
      yaml: 'YAML',
      toml: 'TOML',
      ini: 'INI',
      go: 'Go',
      rust: 'Rust',
      java: 'Java',
      kotlin: 'Kotlin',
      c: 'C',
      cpp: 'C++',
      csharp: 'C#',
      php: 'PHP',
      ruby: 'Ruby',
      swift: 'Swift',
      lua: 'Lua',
      diff: 'Diff',
      dockerfile: 'Dockerfile',
      makefile: 'Makefile',
      graphql: 'GraphQL',
      markdown: 'Markdown',
      text: 'Text',
    }

    const CODE_LANG_ALIASES = {
      js: 'javascript',
      jsx: 'javascript',
      mjs: 'javascript',
      cjs: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      sh: 'shell',
      bash: 'shell',
      zsh: 'shell',
      shellscript: 'shell',
      shellsession: 'shell',
      console: 'shell',
      plaintext: 'text',
      yml: 'yaml',
      md: 'markdown',
      rs: 'rust',
      kt: 'kotlin',
      kts: 'kotlin',
      rb: 'ruby',
      cs: 'csharp',
      'c++': 'cpp',
      'c#': 'csharp',
      ps1: 'powershell',
      pwsh: 'powershell',
      docker: 'dockerfile',
      make: 'makefile',
      gql: 'graphql',
    }

    const CODE_LITERALS = new Set('true false null undefined nil None True False NaN Infinity'.split(' '))
    const CODE_C_KEYWORDS = new Set('abstract as async await break case catch class const continue debugger declare default delete do else enum export extends final finally for from function func get goto if implements import in instanceof interface keyof infer asserts satisfies let native new of override package private protected public readonly record return sealed set static super switch synchronized this throw throws transient try type typeof using var void volatile while with yield fn mut pub impl trait struct match use mod crate where loop move ref dyn unsafe extern self Self permits'.split(' '))
    const CODE_C_TYPES = new Set('any bigint boolean bool byte char double float int long never number object short string symbol unknown unsigned void str vec option result i8 i16 i32 i64 u8 u16 u32 u64 usize isize f32 f64 decimal'.split(' '))
    const CODE_PY_KEYWORDS = new Set('and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return self try while with yield match case'.split(' '))
    const CODE_PY_BUILTINS = new Set('abs all any bin bool bytes callable chr dict dir enumerate eval filter float format frozenset getattr hasattr hash help hex id input int isinstance issubclass iter len list map max min next object oct open ord pow print property range repr reversed round set setattr slice sorted str sum super tuple type vars zip'.split(' '))
    const CODE_SH_KEYWORDS = new Set('if then else elif fi for while in do done case esac function select until time coproc local export readonly return exit set unset shift source alias unalias declare typeset'.split(' '))
    const CODE_SH_BUILTINS = new Set('echo printf read cd pwd pushd popd ls cp mv rm mkdir rmdir touch cat head tail grep egrep fgrep sed awk find xargs sort uniq cut tr wc tee curl wget git npm pnpm yarn node deno python python3 pip sudo chmod chown ps kill sleep date env which type command exec eval test'.split(' '))
    const CODE_SQL_KEYWORDS = new Set('select from where join left right inner outer full on group by order having limit offset insert into values update set delete create table alter drop index view with as and or not is in like between case when then else end distinct union all exists primary key foreign references default constraint asc desc if begin commit rollback grant revoke use database schema'.split(' '))
    const CODE_FN_EXPECT = new Set('function def fn func fun sub proc macro'.split(' '))
    const CODE_TYPE_EXPECT = new Set('class interface type struct enum trait impl namespace module record union'.split(' '))

    function normalizeCodeLang(value) {
      const raw = String(value ?? '').trim().toLowerCase().split(/\s+/)[0].replace(/^[{.]+|[}]+$/g, '')
      const normalized = CODE_LANG_ALIASES[raw] ?? raw
      return {
        raw,
        normalized,
        label: CODE_LANG_LABELS[normalized] ?? (raw || '代码'),
      }
    }

    function nextNonSpace(text, index) {
      let i = index
      while (i < text.length && /\s/.test(text[i])) i += 1
      return text[i] ?? ''
    }

    function codeConfig(lang) {
      const base = {
        keywords: new Set(),
        types: new Set(),
        literals: new Set(),
        builtins: new Set(),
        lineComments: [],
        blockComments: [],
        strings: ['"', "'"],
        propertyColon: false,
        propertyEquals: false,
        caseInsensitive: false,
        shell: false,
        python: false,
        css: false,
        clike: false,
        variables: false,
      }
      switch (lang) {
        case 'javascript':
        case 'typescript':
          return { ...base, keywords: CODE_C_KEYWORDS, types: CODE_C_TYPES, literals: CODE_LITERALS, lineComments: ['//'], blockComments: [['/*', '*/']], strings: ['"', "'", '`'], propertyColon: true, clike: true }
        case 'json':
          return { ...base, literals: new Set(['true', 'false', 'null']), strings: ['"'], propertyColon: true }
        case 'python':
          return { ...base, keywords: CODE_PY_KEYWORDS, builtins: CODE_PY_BUILTINS, literals: CODE_LITERALS, lineComments: ['#'], strings: ['"""', "'''", '"', "'"], python: true }
        case 'shell':
        case 'powershell':
          return { ...base, keywords: CODE_SH_KEYWORDS, builtins: CODE_SH_BUILTINS, literals: CODE_LITERALS, lineComments: ['#'], strings: ['"', "'", '`'], shell: true, variables: true }
        case 'yaml':
          return { ...base, literals: new Set(['true', 'false', 'null', 'yes', 'no', 'on', 'off']), lineComments: ['#'], strings: ['"', "'"], propertyColon: true }
        case 'toml':
          return { ...base, literals: new Set(['true', 'false']), lineComments: ['#'], strings: ['"', "'"], propertyEquals: true }
        case 'ini':
          return { ...base, literals: new Set(['true', 'false', 'yes', 'no', 'on', 'off']), lineComments: ['#', ';'], strings: ['"', "'"], propertyEquals: true }
        case 'css':
        case 'scss':
        case 'less':
          return { ...base, keywords: new Set(['@media', '@import', '@supports', '@keyframes', '@font-face', '@layer', 'from', 'to', 'and', 'or', 'not', 'important']), blockComments: [['/*', '*/']], strings: ['"', "'"], propertyColon: true, css: true }
        case 'sql':
          return { ...base, keywords: CODE_SQL_KEYWORDS, literals: new Set(['null', 'true', 'false']), lineComments: ['--'], blockComments: [['/*', '*/']], strings: ["'", '"'], caseInsensitive: true }
        case 'go':
        case 'rust':
        case 'java':
        case 'kotlin':
        case 'c':
        case 'cpp':
        case 'csharp':
        case 'php':
        case 'swift':
        case 'dart':
        case 'scala':
          return { ...base, keywords: CODE_C_KEYWORDS, types: CODE_C_TYPES, literals: CODE_LITERALS, lineComments: lang === 'php' ? ['//', '#'] : ['//'], blockComments: [['/*', '*/']], strings: ['"', "'", '`'], clike: true, variables: lang === 'php' }
        case 'ruby':
          return { ...base, keywords: new Set([...CODE_C_KEYWORDS, 'def', 'end', 'module', 'require', 'include', 'attr_accessor', 'puts', 'print', 'do', 'then', 'unless', 'until']), types: CODE_C_TYPES, literals: new Set(['true', 'false', 'nil']), lineComments: ['#'], strings: ['"', "'"], clike: true, variables: true }
        case 'lua':
          return { ...base, keywords: new Set('and break do else elseif end false for function goto if in local nil not or repeat return then true until while'.split(' ')), literals: new Set(['true', 'false', 'nil']), lineComments: ['--'], blockComments: [['--[[', ']]']], strings: ['"', "'"], clike: true }
        case 'dockerfile':
          return { ...base, keywords: new Set('FROM RUN CMD LABEL EXPOSE ENV ADD COPY ENTRYPOINT VOLUME USER WORKDIR ARG ONBUILD STOPSIGNAL HEALTHCHECK SHELL AS MAINTAINER'.split(' ')), lineComments: ['#'], strings: ['"', "'"], clike: true }
        case 'makefile':
          return { ...base, keywords: new Set('ifeq ifneq ifdef ifndef else endif include define endef export unexport override private vpath'.split(' ')), lineComments: ['#'], strings: ['"', "'"], propertyColon: true, variables: true }
        case 'graphql':
          return { ...base, keywords: new Set('query mutation subscription fragment on type input enum interface union scalar schema extend directive implements repeatable'.split(' ')), lineComments: ['#'], strings: ['"', "'"], clike: true }
        case 'diff':
          return { ...base, diff: true }
        case 'markdown':
        case 'text':
          return { ...base, plain: true }
        default:
          return { ...base, keywords: CODE_C_KEYWORDS, types: CODE_C_TYPES, literals: CODE_LITERALS, lineComments: ['//', '#'], blockComments: [['/*', '*/'], ['<!--', '-->']], strings: ['"', "'", '`'], clike: true }
      }
    }

    function plainCodeLines(code) {
      return String(code ?? '').split('\n').map((line) => (line ? [{ text: line, cls: '' }] : []))
    }

    function splitCodeTokens(tokens) {
      const lines = [[]]
      for (const token of tokens) {
        const parts = String(token.text ?? '').split('\n')
        for (let i = 0; i < parts.length; i += 1) {
          if (parts[i]) lines[lines.length - 1].push({ text: parts[i], cls: token.cls ?? '' })
          if (i < parts.length - 1) lines.push([])
        }
      }
      return lines
    }

    function readStringEnd(code, start, quote, allowNewline) {
      if (quote.length === 3) {
        const close = code.indexOf(quote, start + 3)
        return close < 0 ? code.length : close + 3
      }
      let i = start + 1
      while (i < code.length) {
        const ch = code[i]
        if (ch === '\\') { i += 2; continue }
        if (ch === quote) return i + 1
        if (ch === '\n' && !allowNewline) return i
        i += 1
      }
      return code.length
    }

    function lexDiff(code) {
      return code.split('\n').map((line) => {
        let cls = ''
        if (/^(?:\+\+\+|---)/.test(line) || /^@@/.test(line)) cls = 'rf-tok-meta'
        else if (line.startsWith('+')) cls = 'rf-tok-add'
        else if (line.startsWith('-')) cls = 'rf-tok-del'
        return [{ text: line, cls }]
      })
    }

    function lexHtml(code) {
      const tokens = []
      const push = (text, cls = '') => { if (text) tokens.push({ text, cls }) }
      let i = 0
      while (i < code.length) {
        if (code.startsWith('<!--', i)) {
          const close = code.indexOf('-->', i + 4)
          const end = close < 0 ? code.length : close + 3
          push(code.slice(i, end), 'rf-tok-com')
          i = end
          continue
        }
        if (code.startsWith('<!', i) || code.startsWith('<?', i)) {
          const close = code.indexOf('>', i + 2)
          const end = close < 0 ? code.length : close + 1
          push(code.slice(i, end), 'rf-tok-meta')
          i = end
          continue
        }
        if (code[i] === '<') {
          let j = i + 1
          push('<', 'rf-tok-punc')
          if (code[j] === '/') {
            push('/', 'rf-tok-punc')
            j += 1
          }
          let k = j
          while (k < code.length && /[A-Za-z0-9:_-]/.test(code[k])) k += 1
          if (k > j) push(code.slice(j, k), 'rf-tok-tag')
          j = k
          while (j < code.length && code[j] !== '>') {
            if (/\s/.test(code[j])) {
              let end = j + 1
              while (end < code.length && /\s/.test(code[end])) end += 1
              push(code.slice(j, end))
              j = end
              continue
            }
            if (code[j] === '/' && code[j + 1] === '>') {
              push('/>', 'rf-tok-punc')
              j += 2
              break
            }
            if (code[j] === '=') {
              push('=', 'rf-tok-punc')
              j += 1
              continue
            }
            if (code[j] === '"' || code[j] === "'") {
              const end = readStringEnd(code, j, code[j], false)
              push(code.slice(j, end), 'rf-tok-str')
              j = end
              continue
            }
            let end = j + 1
            while (end < code.length && /[^\s=/>]/.test(code[end])) end += 1
            push(code.slice(j, end), 'rf-tok-attr')
            j = end
          }
          if (j < code.length && code[j] === '>') {
            push('>', 'rf-tok-punc')
            j += 1
          }
          i = j
          continue
        }
        let j = i
        while (j < code.length && code[j] !== '<') j += 1
        push(code.slice(i, j))
        i = j
      }
      return tokens
    }

    function lexCode(code, lang) {
      const cfg = codeConfig(lang)
      const tokens = []
      const push = (text, cls = '') => { if (text) tokens.push({ text, cls }) }
      let i = 0
      let expect = ''
      let prevChar = ''
      let atLineStart = true
      while (i < code.length) {
        const ch = code[i]
        if (ch === '\n') {
          push('\n')
          i += 1
          prevChar = ''
          atLineStart = true
          continue
        }
        if (ch === ' ' || ch === '\t' || ch === '\r') {
          let j = i + 1
          while (j < code.length && (code[j] === ' ' || code[j] === '\t' || code[j] === '\r')) j += 1
          push(code.slice(i, j))
          i = j
          continue
        }

        let matched = false
        for (const [start, end] of cfg.blockComments) {
          if (!code.startsWith(start, i)) continue
          const close = code.indexOf(end, i + start.length)
          const finish = close < 0 ? code.length : close + end.length
          push(code.slice(i, finish), 'rf-tok-com')
          i = finish
          expect = ''
          prevChar = ''
          atLineStart = false
          matched = true
          break
        }
        if (matched) continue
        for (const start of cfg.lineComments) {
          if (!code.startsWith(start, i)) continue
          let finish = code.indexOf('\n', i)
          if (finish < 0) finish = code.length
          push(code.slice(i, finish), 'rf-tok-com')
          i = finish
          expect = ''
          prevChar = ''
          atLineStart = false
          matched = true
          break
        }
        if (matched) continue

        const quote = cfg.strings.find((item) => code.startsWith(item, i))
        if (quote) {
          const allowNewline = quote === '`' || quote.length === 3
          const finish = readStringEnd(code, i, quote, allowNewline)
          const text = code.slice(i, finish)
          let cls = 'rf-tok-str'
          if (cfg.propertyColon && nextNonSpace(code, finish) === ':') cls = 'rf-tok-param'
          push(text, cls)
          i = finish
          expect = ''
          prevChar = text.slice(-1) || ''
          atLineStart = false
          continue
        }

        if ((cfg.variables || cfg.shell) && ch === '$') {
          let j = i + 1
          if (code[j] === '{') {
            const close = code.indexOf('}', j + 1)
            j = close < 0 ? code.length : close + 1
          } else if (code[j] === '(') {
            const close = code.indexOf(')', j + 1)
            j = close < 0 ? code.length : close + 1
          } else if (/[A-Za-z_]/.test(code[j] ?? '')) {
            j += 1
            while (j < code.length && /[A-Za-z0-9_]/.test(code[j])) j += 1
          } else if (/[0-9@*#?!$-]/.test(code[j] ?? '')) {
            j += 1
          }
          push(code.slice(i, j), 'rf-tok-param')
          i = j
          expect = ''
          prevChar = code.slice(i - 1, i)
          atLineStart = false
          continue
        }

        if (cfg.python && ch === '@') {
          let j = i + 1
          while (j < code.length && /[A-Za-z0-9_.]/.test(code[j])) j += 1
          push(code.slice(i, j), 'rf-tok-fn')
          i = j
          expect = ''
          prevChar = code.slice(i - 1, i)
          atLineStart = false
          continue
        }

        if (cfg.shell && ch === '-' && /[A-Za-z]/.test(code[i + 1] ?? '')) {
          let j = i + 2
          while (j < code.length && /[A-Za-z0-9-]/.test(code[j])) j += 1
          push(code.slice(i, j), 'rf-tok-kw')
          i = j
          expect = ''
          prevChar = code.slice(i - 1, i)
          atLineStart = false
          continue
        }

        if (cfg.css && ch === '@') {
          let j = i + 1
          while (j < code.length && /[A-Za-z-]/.test(code[j])) j += 1
          push(code.slice(i, j), 'rf-tok-kw')
          i = j
          expect = ''
          prevChar = code.slice(i - 1, i)
          atLineStart = false
          continue
        }

        if (cfg.css && ch === '-' && code[i + 1] === '-') {
          let j = i + 2
          while (j < code.length && /[A-Za-z0-9_-]/.test(code[j])) j += 1
          push(code.slice(i, j), 'rf-tok-param')
          i = j
          expect = ''
          prevChar = code.slice(i - 1, i)
          atLineStart = false
          continue
        }

        if (cfg.css && ch === '#') {
          const match = /^#[0-9a-fA-F]{3,8}(?![0-9a-fA-F])/.exec(code.slice(i))
          if (match) {
            push(match[0], 'rf-tok-num')
            i += match[0].length
            expect = ''
            prevChar = code.slice(i - 1, i)
            atLineStart = false
            continue
          }
        }

        if (cfg.propertyEquals && ch === '[') {
          const close = code.indexOf(']', i + 1)
          if (close >= 0) {
            push(code.slice(i, close + 1), 'rf-tok-kw')
            i = close + 1
            expect = ''
            prevChar = ']'
            atLineStart = false
            continue
          }
        }

        if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(code[i + 1] ?? ''))) {
          const match = /^(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|\.\d+(?:[eE][+-]?\d+)?|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(code.slice(i))
          if (match) {
            push(match[0], 'rf-tok-num')
            i += match[0].length
            expect = ''
            prevChar = code.slice(i - 1, i)
            atLineStart = false
            continue
          }
        }

        if (/[A-Za-z_$]/.test(ch)) {
          let j = i + 1
          while (j < code.length && /[A-Za-z0-9_$]/.test(code[j])) j += 1
          const name = code.slice(i, j)
          const lower = cfg.caseInsensitive ? name.toLowerCase() : name
          const next = nextNonSpace(code, j)
          const lineStart = atLineStart
          let cls = ''
          if (expect === 'fn') {
            cls = 'rf-tok-fn'
            expect = ''
          } else if (expect === 'type') {
            cls = 'rf-tok-type'
            expect = ''
          } else if (!cfg.css && prevChar === '.') {
            cls = next === '(' ? 'rf-tok-fn' : 'rf-tok-prop'
          } else if (cfg.keywords.has(lower)) {
            cls = 'rf-tok-kw'
          } else if (cfg.literals.has(lower)) {
            cls = 'rf-tok-num'
          } else if (cfg.types.has(lower)) {
            cls = 'rf-tok-type'
          } else if (cfg.builtins.has(lower)) {
            cls = 'rf-tok-fn'
          } else if (cfg.propertyColon && next === ':') {
            cls = 'rf-tok-param'
          } else if (cfg.propertyEquals && next === '=') {
            cls = 'rf-tok-param'
          } else if (cfg.shell && lineStart && next === '=') {
            cls = 'rf-tok-param'
          } else if (cfg.shell && lineStart) {
            cls = 'rf-tok-fn'
          } else if (next === '(') {
            cls = 'rf-tok-fn'
          } else if ((cfg.clike || cfg.python) && /^[A-Z]/.test(name)) {
            cls = 'rf-tok-type'
          }
          if (cls === 'rf-tok-kw') {
            if (CODE_FN_EXPECT.has(lower)) expect = 'fn'
            else if (CODE_TYPE_EXPECT.has(lower)) expect = 'type'
          }
          push(name, cls)
          i = j
          prevChar = name.slice(-1)
          atLineStart = false
          continue
        }

        push(ch, 'rf-tok-punc')
        i += 1
        expect = ''
        prevChar = ch
        atLineStart = false
      }
      return tokens
    }

    function highlightCode(code, lang) {
      const source = String(code ?? '').replace(/\r\n?/g, '\n').replace(/\n$/, '')
      if (source.length > 60_000) return plainCodeLines(source)
      const info = normalizeCodeLang(lang)
      try {
        if (info.normalized === 'diff') return lexDiff(source)
        if (['html', 'xml', 'vue', 'svelte'].includes(info.normalized)) return splitCodeTokens(lexHtml(source))
        if (['markdown', 'text', 'plain'].includes(info.normalized)) return plainCodeLines(source)
        return splitCodeTokens(lexCode(source, info.normalized))
      } catch {
        return plainCodeLines(source)
      }
    }

    async function copyCodeText(text) {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text)
          return true
        }
      } catch { }
      try {
        const area = document.createElement('textarea')
        area.value = text
        area.setAttribute('readonly', '')
        area.style.position = 'fixed'
        area.style.left = '-9999px'
        document.body.appendChild(area)
        area.select()
        const ok = document.execCommand('copy')
        area.remove()
        return ok
      } catch {
        return false
      }
    }

    function CodeBlock({ code, lang }) {
      const info = normalizeCodeLang(lang)
      const [wrapped, setWrapped] = useState(true)
      const [copyState, setCopyState] = useState('idle')
      const timerRef = useRef(null)
      useEffect(() => () => {
        if (timerRef.current) clearTimeout(timerRef.current)
      }, [])
      const lines = highlightCode(code, info.normalized)
      async function handleCopy() {
        const ok = await copyCodeText(String(code ?? ''))
        setCopyState(ok ? 'copied' : 'error')
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => setCopyState('idle'), 1500)
      }
      const copyLabel = copyState === 'copied' ? '已复制' : copyState === 'error' ? '复制失败' : '复制'
      return h('div', { className: 'rf-code', 'data-wrap': wrapped ? 'true' : 'false' },
        h('div', { className: 'rf-code-head' },
          h('span', { className: 'rf-code-lang', title: info.raw || '代码' }, info.label),
          h('div', { className: 'rf-code-actions' },
            h('button', {
              type: 'button',
              className: 'rf-code-btn',
              onClick: () => setWrapped((current) => !current),
              'aria-pressed': wrapped,
              title: wrapped ? '取消自动换行' : '自动换行',
            }, wrapped ? '不换行' : '换行'),
            h('button', {
              type: 'button',
              className: 'rf-code-btn',
              onClick: () => { void handleCopy() },
              title: '复制代码',
              'aria-live': 'polite',
            }, copyLabel))),
        h('div', { className: 'rf-code-body' },
          h('pre', { className: 'rf-code-pre' }, lines.map((line, lineIndex) => h('div', {
            key: lineIndex,
            className: 'rf-code-line',
          }, line.map((token, tokenIndex) => (token.cls
            ? h('span', { key: tokenIndex, className: token.cls }, token.text)
            : token.text)))))))
    }

    function renderMarkdown(text) {
      const source = String(text ?? '')
        .replace(/\r\n?/g, '\n')
        .replace(/<at[^>]*>([^<]*)<\/at>/g, (_, name) => `@${name || '成员'}`)
      const lines = source.split('\n')
      const blocks = []
      let i = 0
      let key = 0
      while (i < lines.length) {
        const line = lines[i]
        if (/^\s*```/.test(line)) {
          const lang = line.trim().slice(3).trim()
          const code = []
          i += 1
          while (i < lines.length && !/^\s*```/.test(lines[i])) { code.push(lines[i]); i += 1 }
          if (i < lines.length) i += 1
          blocks.push(h(CodeBlock, { key: `code${key++}`, code: code.join('\n'), lang }))
          continue
        }
        if (!line.trim()) { i += 1; continue }
        if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) { blocks.push(h('hr', { key: `hr${key++}` })); i += 1; continue }
        const heading = /^(#{1,6})\s+(.*)$/.exec(line)
        if (heading) {
          const level = Math.min(heading[1].length, 3)
          blocks.push(h(`h${level}`, { key: `h${key++}`, className: `rf-h${level}` }, ...renderInline(heading[2])))
          i += 1
          continue
        }
        if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
          const header = splitTableRow(line)
          i += 2
          const rows = []
          while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
            rows.push(splitTableRow(lines[i]))
            i += 1
          }
          blocks.push(h('div', { key: `tw${key++}`, className: 'rf-table-wrap' },
            h('table', null,
              h('thead', null, h('tr', null, header.map((cell, ci) => h('th', { key: ci }, ...renderInline(cell))))),
              h('tbody', null, rows.map((row, ri) => h('tr', { key: ri }, row.map((cell, ci) => h('td', { key: ci }, ...renderInline(cell)))))))))
          continue
        }
        if (/^\s*([-*+])\s+/.test(line)) {
          const items = []
          while (i < lines.length && /^\s*([-*+])\s+/.test(lines[i])) {
            items.push(lines[i].replace(/^\s*([-*+])\s+/, ''))
            i += 1
          }
          blocks.push(h('ul', { key: `ul${key++}` }, items.map((item, ii) => h('li', { key: ii }, ...renderInline(item)))))
          continue
        }
        if (/^\s*\d+[.)]\s+/.test(line)) {
          const items = []
          while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
            items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''))
            i += 1
          }
          blocks.push(h('ol', { key: `ol${key++}` }, items.map((item, ii) => h('li', { key: ii }, ...renderInline(item)))))
          continue
        }
        if (/^\s*>\s?/.test(line)) {
          const quote = []
          while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
            quote.push(lines[i].replace(/^\s*>\s?/, ''))
            i += 1
          }
          blocks.push(h('blockquote', { key: `q${key++}` }, ...renderInline(quote.join('\n'))))
          continue
        }
        blocks.push(h('div', { key: `p${key++}`, className: 'rf-p' }, ...renderInline(line)))
        i += 1
      }
      return blocks
    }

    function Markdown({ text }) {
      try {
        const blocks = renderMarkdown(text)
        if (!blocks.length) return h('div', { className: 'rf-md' }, String(text ?? ''))
        return h('div', { className: 'rf-md' }, ...blocks)
      } catch {
        return h('div', { className: 'rf-md' }, String(text ?? ''))
      }
    }

    function PanelIcon({ size = 20 }) {
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true,
        style: { display: 'block' },
      },
        h('path', {
          d: 'M4.5 4.5h15A1.5 1.5 0 0 1 21 6v9a1.5 1.5 0 0 1-1.5 1.5H11l-4.5 3v-3h-2A1.5 1.5 0 0 1 3 15V6a1.5 1.5 0 0 1 1.5-1.5Z',
          stroke: 'currentColor', strokeWidth: 1.6, strokeLinejoin: 'round',
        }),
        h('path', { d: 'm9 11 6-3.2-2.2 3.2L15 14.2 9 11Z', fill: 'currentColor' }))
    }

    function StatusDot({ tone }) {
      return h('span', { className: `rf-dot ${tone}`, 'aria-hidden': true })
    }

    function BotGlyph() {
      return h('svg', {
        viewBox: '0 0 24 24', width: 16, height: 16, fill: 'none', stroke: 'currentColor',
        strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
      },
      h('path', { d: 'M12 3v3' }),
      h('rect', { x: 4, y: 6, width: 16, height: 13, rx: 4 }),
      h('circle', { cx: 9, cy: 12, r: 1.1, fill: 'currentColor', stroke: 'none' }),
      h('circle', { cx: 15, cy: 12, r: 1.1, fill: 'currentColor', stroke: 'none' }),
      h('path', { d: 'M9 16h6' }))
    }

    function Avatar({ kind = 'bot' }) {
      return h('div', { className: `rf-avatar ${kind === 'me' ? 'me' : 'bot'}`, 'aria-hidden': true }, kind === 'bot' ? h(BotGlyph) : '我')
    }

    function Banner({ kind = 'error', children, onClose }) {
      return h('div', { className: `rf-banner ${kind}` },
        h('div', { className: 'rf-banner-text' }, children),
        onClose ? h('button', { type: 'button', className: 'rf-banner-close', onClick: onClose, 'aria-label': '关闭' }, '×') : null)
    }

    function PrepChecklist() {
      return h('div', { className: 'rf-prep' },
        h('div', { className: 'rf-prep-title' }, '使用前准备'),
        h('ol', { className: 'rf-prep-list' },
          h('li', null, '在目标智能体开通飞书接入通道。'),
          h('li', null, '如果目标智能体是 DeepSeek Harness（DSH），需要先安装并启用 @cubeai/dsh-feishu-channels 插件，然后在「飞书频道」页签点击「添加飞书频道」，填写频道名称并扫码创建飞书机器人应用。'),
          h('li', null, '回到这里填写该飞书机器人应用的 App ID / App Secret，保存后授权；插件会自动绑定单聊。')))
    }

    function AttachmentImage({ attachment, appId, messageId, onPreview }) {
      const [failed, setFailed] = useState(false)
      const url = resourceUrl(appId, messageId, attachment)
      if (!url) return null
      if (failed) {
        return h('div', { className: 'rf-attachment-error' },
          h('span', null, '图片加载失败'),
          h('a', { href: url, target: '_blank', rel: 'noreferrer' }, '打开'))
      }
      return h('button', {
        type: 'button',
        className: 'rf-attachment-image',
        onClick: () => onPreview?.(attachment),
        title: '点击预览图片',
      }, h('img', {
        src: url,
        alt: attachment.name || '图片',
        loading: 'lazy',
        onError: () => setFailed(true),
      }))
    }

    function AudioAttachment({ attachment, appId, messageId }) {
      const url = resourceUrl(appId, messageId, attachment)
      if (!url) return null
      const download = resourceUrl(appId, messageId, attachment, true)
      const duration = formatDuration(attachment.duration)
      return h('div', { className: 'rf-attachment-media' },
        h('audio', { controls: true, preload: 'metadata', src: url }),
        h('div', { className: 'rf-attachment-caption' },
          h('span', { className: 'rf-attachment-name', title: attachment.name }, attachment.name || '语音'),
          duration ? h('span', null, ` · ${duration}`) : null,
          download ? h('a', { href: download, className: 'rf-attachment-download' }, '下载') : null))
    }

    function VideoAttachment({ attachment, appId, messageId }) {
      const url = resourceUrl(appId, messageId, attachment)
      if (!url) return null
      const poster = attachment.imageKey
        ? resourceUrl(appId, messageId, { ...attachment, fileKey: attachment.imageKey, resourceType: 'image' })
        : ''
      const download = resourceUrl(appId, messageId, attachment, true)
      const duration = formatDuration(attachment.duration)
      return h('div', { className: 'rf-attachment-media' },
        h('video', {
          controls: true,
          preload: 'metadata',
          playsInline: true,
          src: url,
          ...(poster ? { poster } : {}),
        }),
        h('div', { className: 'rf-attachment-caption' },
          h('span', { className: 'rf-attachment-name', title: attachment.name }, attachment.name || '视频'),
          duration ? h('span', null, ` · ${duration}`) : null,
          download ? h('a', { href: download, className: 'rf-attachment-download' }, '下载') : null))
    }

    function FileAttachment({ attachment, appId, messageId }) {
      const open = resourceUrl(appId, messageId, attachment)
      const download = resourceUrl(appId, messageId, attachment, true)
      const ext = fileExtension(attachment.name) || 'FILE'
      const size = formatBytes(attachment.size)
      return h('div', { className: 'rf-attachment-file' },
        h('div', { className: 'rf-file-icon', 'aria-hidden': true }, ext),
        h('div', { className: 'rf-file-main' },
          h('div', { className: 'rf-file-name', title: attachment.name }, attachment.name || '文件'),
          h('div', { className: 'rf-file-meta' }, [size, '文件'].filter(Boolean).join(' · '))),
        h('div', { className: 'rf-file-actions' },
          open ? h('a', { className: 'rf-file-btn', href: open, target: '_blank', rel: 'noreferrer' }, '预览') : null,
          download ? h('a', { className: 'rf-file-btn primary', href: download, download: attachment.name || 'file' }, '下载') : null))
    }

    function AttachmentList({ attachments, appId, messageId, onPreview }) {
      if (!Array.isArray(attachments) || !attachments.length) return null
      return h('div', { className: 'rf-attachments' }, attachments.map((attachment, index) => {
        const key = `${attachment.fileKey || attachment.imageKey || index}`
        const kind = attachment.kind || 'file'
        if (kind === 'image' || kind === 'sticker') {
          return h(AttachmentImage, { key, attachment, appId, messageId, onPreview })
        }
        if (kind === 'audio') return h(AudioAttachment, { key, attachment, appId, messageId })
        if (kind === 'video') return h(VideoAttachment, { key, attachment, appId, messageId })
        return h(FileAttachment, { key, attachment, appId, messageId })
      }))
    }

    function MediaModal({ preview, onClose }) {
      useEffect(() => {
        if (!preview) return
        const onKey = (event) => { if (event.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [preview, onClose])
      if (!preview) return null
      return h('div', {
        className: 'rf-media-overlay',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': preview.name || '附件预览',
        onClick: onClose,
      },
        h('div', { className: 'rf-media-dialog', onClick: (event) => event.stopPropagation() },
          h('div', { className: 'rf-media-head' },
            h('div', { className: 'rf-media-title', title: preview.name }, preview.name || '附件预览'),
            h('div', { className: 'rf-media-actions' },
              preview.downloadUrl ? h('a', { className: 'rf-media-download', href: preview.downloadUrl, download: preview.name || '' }, '下载') : null,
              h('button', { type: 'button', className: 'rf-media-close', onClick: onClose, 'aria-label': '关闭' }, '×'))),
          h('div', { className: 'rf-media-body' },
            preview.kind === 'image'
              ? h('img', { src: preview.url, alt: preview.name || '' })
              : preview.kind === 'video'
                ? h('video', { src: preview.url, controls: true, autoPlay: true, playsInline: true })
                : preview.kind === 'audio'
                  ? h('audio', { src: preview.url, controls: true, autoPlay: true })
                  : h('a', { href: preview.url, target: '_blank', rel: 'noreferrer' }, '打开附件'))))
    }

    function AttachmentChip({ attachment, busy, onRemove }) {
      const kindLabel = attachment.kind === 'image' ? '图片' : attachment.kind === 'audio' ? '语音' : attachment.kind === 'video' ? '视频' : '文件'
      const size = formatBytes(attachment.size)
      const ext = fileExtension(attachment.name) || 'FILE'
      return h('div', { className: 'rf-composer-attachment' },
        attachment.previewUrl
          ? h('img', { className: 'rf-composer-attachment-thumb', src: attachment.previewUrl, alt: '' })
          : h('div', { className: 'rf-composer-attachment-thumb file', 'aria-hidden': true }, ext),
        h('div', { className: 'rf-composer-attachment-main' },
          h('div', { className: 'rf-composer-attachment-name', title: attachment.name }, attachment.name),
          h('div', { className: 'rf-composer-attachment-meta' }, [kindLabel, size].filter(Boolean).join(' · '))),
        h('button', {
          type: 'button',
          className: 'rf-composer-attachment-remove',
          onClick: onRemove,
          disabled: busy,
          'aria-label': '移除附件',
        }, '×'))
    }

    function ApprovalButtons({ message, actions, usedActions, onAction }) {
      return h('div', { className: 'rf-approval-actions' },
        actions.map((action) => {
          const originalIndex = Array.isArray(message.actions) ? message.actions.indexOf(action) : -1
          const index = originalIndex >= 0 ? originalIndex : (action.index ?? 0)
          const key = actionKey(message, action, index)
          const used = Boolean(usedActions[key])
          const approve = approvalActionValue(action) === '批准'
          return h('button', {
            key,
            type: 'button',
            className: `rf-approval-btn ${approve ? 'approve' : 'reject'}`,
            disabled: used,
            onClick: () => onAction(message, action, index),
          }, used ? '已处理' : (action.label || (approve ? '批准' : '拒绝')))
        }))
    }

    function ApprovalInline({ message, actions, usedActions, onAction }) {
      return h('div', { className: 'rf-approval-inline' },
        h('div', { className: 'rf-approval-head' },
          h('div', { className: 'rf-approval-icon', 'aria-hidden': true }, '!'),
          h('div', { className: 'rf-approval-copy' },
            h('div', { className: 'rf-approval-title' }, '需要你的审批'),
            h('div', { className: 'rf-approval-desc' }, '点击按钮选择，或在输入框回复「批准」/「拒绝」。'))),
        h(ApprovalButtons, { message, actions, usedActions, onAction }))
    }

    function MessageBubble({ message, usedActions, onAction, appId, onPreview }) {
      if (message.role === 'system') return h('div', { className: 'rf-system' }, message.text)
      const mine = message.role === 'user'
      const actions = Array.isArray(message.actions) ? message.actions : []
      const approvalActions = isExpiredMessage(message) ? [] : actions.filter(isApprovalAction)
      const pendingApprovalActions = approvalActions.filter((action) => !usedActions[actionKey(message, action, actions.indexOf(action))])
      const normalActions = actions.filter((action) => !isApprovalAction(action))
      const attachments = Array.isArray(message.attachments) ? message.attachments : []
      const rawText = String(message.text ?? '')
      const placeholder = attachments.length > 0 && (
        /^\[(图片|语音|视频|表情)\]$/.test(rawText.trim())
        || (rawText.startsWith('[文件]') && attachments.length === 1)
      )
      const text = placeholder ? '' : rawText
      const body = []
      if (text) body.push(mine ? text : h(Markdown, { text }))
      if (attachments.length) {
        body.push(h(AttachmentList, {
          attachments,
          appId,
          messageId: message.id,
          onPreview: (attachment) => onPreview?.(message.id, attachment),
        }))
      }
      if (!body.length) body.push(mine ? '（空消息）' : h(Markdown, { text: '' }))
      return h('div', { className: `rf-row ${mine ? 'user' : 'assistant'}` },
        mine ? null : h(Avatar, { kind: 'bot' }),
        h('div', { className: 'rf-msg-main' },
          h('div', { className: 'rf-msg-meta' }, `${message.senderName ?? (mine ? '你' : '远端')} · ${formatTime(message.createdAt)}`),
          h('div', { className: `rf-bubble ${mine ? 'user' : 'assistant'}` }, ...body),
          pendingApprovalActions.length
            ? h(ApprovalInline, { message, actions: pendingApprovalActions, usedActions, onAction })
            : null,
          normalActions.length
            ? h('div', { className: 'rf-actions' }, normalActions.map((action) => {
              const index = actions.indexOf(action)
              const key = actionKey(message, action, index)
              const used = Boolean(usedActions[key])
              if (action.url) {
                return h('a', { key, className: 'rf-action', href: action.url, target: '_blank', rel: 'noreferrer' }, action.label)
              }
              return h('button', {
                key, type: 'button', className: `rf-action ${used ? 'used' : ''}`, disabled: used,
                onClick: () => onAction(message, action, index),
              }, used ? `✓ ${action.label}` : action.label)
            }))
            : null),
        mine ? h(Avatar, { kind: 'me' }) : null)
    }

    function TypingBubble() {
      return h('div', { className: 'rf-row assistant' },
        h(Avatar, { kind: 'bot' }),
        h('div', { className: 'rf-bubble assistant rf-typing', 'aria-label': '远端正在处理' },
          h('span', { className: 'rf-typing-dot' }),
          h('span', { className: 'rf-typing-dot' }),
          h('span', { className: 'rf-typing-dot' })))
    }

    function MessageList({ messages, loading, usedActions, onAction, scrollRef, onScroll, typing, auth, authLoading, onAuthorize, appId, onPreview }) {
      if (loading) {
        return h('div', { className: 'rf-messages', ref: scrollRef, onScroll },
          h('div', { className: 'rf-skeleton' },
            h('div', { className: 'rf-skeleton-row' }),
            h('div', { className: 'rf-skeleton-row right' }),
            h('div', { className: 'rf-skeleton-row' })))
      }
      if (!messages.length) {
        const authorized = Boolean(auth?.authorized)
        const checking = Boolean(authLoading)
        return h('div', { className: 'rf-messages rf-messages-empty', ref: scrollRef, onScroll },
          h('div', { className: 'rf-chat-empty' },
            h('div', { className: 'rf-chat-empty-title' }, checking ? '正在检查授权…' : authorized ? '开始对话' : '先授权飞书用户'),
            h('div', { className: 'rf-chat-empty-desc' },
              checking ? '正在读取当前机器人的授权状态。' : authorized ? '发一条消息，远端的 @cubeai/dsh-feishu-channels 插件会收到，并在这里回复。' : '授权后，插件会以你本人的身份把消息发到与机器人的单聊。'),
            !authorized && !checking ? h('button', { type: 'button', className: 'rf-btn primary', onClick: onAuthorize }, '授权飞书用户') : null))
      }
      const rows = []
      let lastDay = ''
      for (const message of messages) {
        const day = dayKey(message.createdAt)
        if (day !== lastDay) {
          rows.push(h('div', { key: `day:${day}:${message.id}`, className: 'rf-day' }, formatDay(message.createdAt)))
          lastDay = day
        }
        rows.push(h(MessageBubble, { key: message.id, message, usedActions, onAction, appId, onPreview }))
      }
      if (typing) rows.push(h(TypingBubble, { key: 'typing' }))
      return h('div', { className: 'rf-messages', ref: scrollRef, onScroll, role: 'log', 'aria-live': 'polite' }, ...rows)
    }

    function Composer({ text, setText, busy, authorized, authLoading, onSend, onAuthorize, textareaRef, attachment, onAttach, onRemoveAttachment }) {
      const fileInputRef = useRef(null)
      useEffect(() => {
        const element = textareaRef.current
        if (!element) return
        element.style.height = 'auto'
        element.style.height = `${Math.min(140, element.scrollHeight)}px`
      }, [text, textareaRef])
      return h('div', { className: 'rf-composer' },
        !authorized && !authLoading ? h('div', { className: 'rf-auth-hint' }, '尚未授权飞书用户，', h('button', { type: 'button', className: 'rf-link', onClick: onAuthorize }, '立即授权'), ' 后即可发送。') : null,
        h('div', { className: 'rf-composer-card' },
          attachment ? h(AttachmentChip, { attachment, busy, onRemove: onRemoveAttachment }) : null,
          h('textarea', {
            ref: textareaRef, className: 'rf-textarea', rows: 1, value: text,
            placeholder: authorized ? '给远端智能体发消息…' : authLoading ? '正在检查授权…' : '授权后即可发送…',
            onChange: (event) => setText(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                onSend()
              }
            },
            disabled: busy,
          }),
          h('div', { className: 'rf-composer-bar' },
            h('div', { className: 'rf-composer-left' },
              h('button', {
                type: 'button',
                className: 'rf-attach-btn',
                onClick: () => fileInputRef.current?.click(),
                disabled: busy,
                title: '添加图片、文件或音视频',
                'aria-label': '添加附件',
              }, '＋'),
              h('input', {
                ref: fileInputRef,
                type: 'file',
                style: { display: 'none' },
                onChange: (event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (file) onAttach(file)
                },
                disabled: busy,
              }),
              h('div', { className: 'rf-composer-hint' }, 'Enter 发送 · Shift+Enter 换行 · 可粘贴图片/文件')),
            h('button', { type: 'button', className: 'rf-btn primary', onClick: onSend, disabled: busy || (!text.trim() && !attachment) || !authorized }, busy ? '发送中…' : '发送'))))
    }

    function ChatHeader({ app, auth, busy, onRefresh, onSettings }) {
      const effectiveAuth = auth ?? app.auth
      const state = statusOf(effectiveAuth)
      return h('header', { className: 'rf-chat-header' },
        h(Avatar, { kind: 'bot' }),
        h('div', { className: 'rf-chat-title-wrap' },
          h('div', { className: 'rf-chat-title' }, app.name || '飞书机器人'),
          h('div', { className: 'rf-chat-sub' },
            h(StatusDot, { tone: state.tone }),
            h('span', null, state.label),
            h('span', null, '·'),
            h('span', { className: 'rf-mono', title: app.appId }, app.appId),
            h('span', null, '·'),
            h('span', { className: 'rf-mono', title: app.chatId }, app.chatId))),
        h('div', { className: 'rf-chat-actions' },
          h('button', { type: 'button', className: 'rf-btn', onClick: onRefresh, disabled: busy, title: '刷新' }, '刷新'),
          h('button', { type: 'button', className: 'rf-btn', onClick: onSettings, title: '设置' }, '设置')))
    }

    function ChatView(props) {
      const {
        app, auth, authLoading, messages, messagesLoading, text, setText, busy, authorized,
        onSend, onRefresh, onAuthorize, onSettings, authUrl, pollError,
        usedActions, onAction, showJump, unread, onJump, typing,
        scrollRef, onScroll, textareaRef, attachment, onAttach, onRemoveAttachment, onPreview,
      } = props
      return h('div', { className: 'rf-chat' },
        h(ChatHeader, { app, auth, busy, onRefresh, onSettings }),
        auth?.warning ? h(Banner, { kind: 'warn' }, auth.warning) : null,
        auth?.error ? h(Banner, { kind: 'error' }, auth.error) : null,
        pollError ? h(Banner, { kind: 'warn' }, '实时更新暂时中断，正在自动重试…') : null,
        authUrl ? h(Banner, { kind: 'warn' }, h('a', { href: authUrl, target: '_blank', rel: 'noreferrer' }, '浏览器拦截了授权弹窗，点此打开飞书授权页')) : null,
        h('div', { className: 'rf-chat-body' },
          h(MessageList, { messages, loading: messagesLoading, usedActions, onAction, scrollRef, onScroll, typing, auth, authLoading, onAuthorize, appId: app.id, onPreview }),
          showJump ? h('button', { type: 'button', className: 'rf-jump', onClick: onJump }, unread > 0 ? `${unread} 条新消息 ↓` : '有新消息 ↓') : null,
          h(Composer, { text, setText, busy, authorized, authLoading, onSend, onAuthorize, textareaRef, attachment, onAttach, onRemoveAttachment })))
    }

    function AppRow({ app, active, meta, onClick }) {
      const state = statusOf(app.auth)
      const tagText = Array.isArray(app.tags) ? app.tags.join(', ') : ''
      const preview = meta?.text || app.description || (app.chatId ? (app.auth?.authorized ? '已授权，开始对话' : '未授权') : '未绑定单聊')
      return h('button', {
        type: 'button',
        className: `rf-bot ${active ? 'active' : ''}`,
        onClick,
        'aria-current': active ? 'true' : undefined,
        title: [app.name, app.appId, app.chatId || '未绑定单聊', app.description || '', tagText ? `标签：${tagText}` : ''].filter(Boolean).join('\n'),
      },
        h('div', { className: 'rf-bot-avatar', 'aria-hidden': true }, h(BotGlyph)),
        h('div', { className: 'rf-bot-main' },
          h('div', { className: 'rf-bot-name' }, app.name || '飞书机器人'),
          h('div', { className: 'rf-bot-preview' }, String(preview).replace(/\s+/g, ' ').slice(0, 80))),
        h('div', { className: 'rf-bot-side' },
          meta?.at ? h('div', { className: 'rf-bot-time' }, formatShort(meta.at)) : null,
          h(StatusDot, { tone: state.tone })))
    }

    function AppForm({ busy, error, onCreate, onCancel }) {
      const [form, setForm] = useState({ name: '', appId: '', appSecret: '', description: '', tags: '' })
      const [localError, setLocalError] = useState('')
      const [showSecret, setShowSecret] = useState(false)
      const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
      function submit(event) {
        event.preventDefault()
        const appId = form.appId.trim()
        const appSecret = form.appSecret.trim()
        if (!appId || !appSecret) { setLocalError('App ID 和 App Secret 都必须填写。'); return }
        setLocalError('')
        onCreate({ ...form, appId, appSecret, name: form.name.trim(), description: form.description.trim(), tags: form.tags })
      }
      const message = localError || error
      return h('div', { className: 'rf-form-wrap' },
        h('form', { className: 'rf-form-card', onSubmit: submit },
          h('div', null,
            h('h2', { className: 'rf-form-title' }, '添加飞书机器人'),
            h('p', { className: 'rf-form-desc' }, '填写目标智能体所用飞书机器人应用的凭据。一个飞书机器人应用对应一个单聊，保存后授权会自动绑定。')),
          h(PrepChecklist),
          message ? h('div', { className: 'rf-alert' }, message) : null,
          h('label', { className: 'rf-field' },
            h('span', { className: 'rf-label' }, '名称'),
            h('input', { className: 'rf-input', value: form.name, onChange: set('name'), placeholder: '例如：远端DSH助理1号', maxLength: 60, autoFocus: true }),
            h('span', { className: 'rf-hint' }, '用于本插件列表和聊天页显示；建议与目标智能体「飞书频道」中的频道名称一致。')),
          h('label', { className: 'rf-field' },
            h('span', { className: 'rf-label' }, 'App ID'),
            h('input', { className: 'rf-input', value: form.appId, onChange: set('appId'), placeholder: 'cli_xxx', autoComplete: 'off', spellCheck: false }),
            h('span', { className: 'rf-hint' }, '目标智能体为DSH：在「飞书频道」的频道设置中复制；其他：在飞书开发者后台的「凭证与基础信息」中获取。')),
          h('label', { className: 'rf-field' },
            h('span', { className: 'rf-label' }, 'App Secret'),
            h('div', { className: 'rf-input-wrap' },
              h('input', { className: 'rf-input', value: form.appSecret, onChange: set('appSecret'), placeholder: 'App Secret', type: showSecret ? 'text' : 'password', autoComplete: 'new-password', spellCheck: false }),
              h('button', { type: 'button', className: 'rf-btn', onClick: () => setShowSecret((current) => !current) }, showSecret ? '隐藏' : '显示')),
            h('span', { className: 'rf-hint' }, '目标智能体为DSH：在「飞书频道」的频道设置中显示/复制；其他：在飞书开发者后台的「凭证与基础信息」中获取。')),
          h('label', { className: 'rf-field' },
            h('span', { className: 'rf-label' }, '能力描述'),
            h('textarea', {
              className: 'rf-input',
              rows: 3,
              maxLength: 500,
              value: form.description,
              onChange: set('description'),
              placeholder: '例如：远端DSH助理1号，擅长日常办公，文档处理。',
            }),
            h('span', { className: 'rf-hint' }, '可选。供模型选择远端时参考，最多 500 字。')),
          h('label', { className: 'rf-field' },
            h('span', { className: 'rf-label' }, '标签'),
            h('input', {
              className: 'rf-input',
              value: form.tags,
              onChange: set('tags'),
              placeholder: '办公, 文档',
            }),
            h('span', { className: 'rf-hint' }, '可选。逗号分隔，最多 10 个；用于按能力筛选远端。')),
          h('div', { className: 'rf-form-actions' },
            h('button', { type: 'button', className: 'rf-btn', onClick: onCancel, disabled: busy }, '取消'),
            h('button', { type: 'submit', className: 'rf-btn primary', disabled: busy },
              busy ? h('span', { className: 'rf-spinner' }) : null,
              busy ? '保存中…' : '保存并继续'))))
    }

    function AppSetup({ app, busy, binding, bindError, authUrl, onAuthorize, onBind, onRebind, onUpdate, onDelete, onBack, onTest }) {
      const auth = app.auth ?? {}
      const authorized = Boolean(auth.authorized)
      const bound = Boolean(app.chatId)
      const [name, setName] = useState(app.name ?? '')
      const [description, setDescription] = useState(app.description ?? '')
      const [tags, setTags] = useState((app.tags ?? []).join(', '))
      const [nameError, setNameError] = useState('')
      useEffect(() => {
        setName(app.name ?? '')
        setDescription(app.description ?? '')
        setTags((app.tags ?? []).join(', '))
        setNameError('')
      }, [app.id])
      const tagValues = tags.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean)
      const dirty = name.trim() !== (app.name ?? '')
        || description.trim() !== (app.description ?? '')
        || tagValues.join(',') !== (app.tags ?? []).join(',')
      const statusLine = authorized
        ? (bound ? '已授权并绑定单聊' : '已授权，尚未绑定单聊')
        : '尚未授权'
      async function saveMeta() {
        const next = name.trim()
        if (!next) { setNameError('名称不能为空'); return }
        if (!dirty) return
        setNameError('')
        try {
          await onUpdate({ name: next, description: description.trim(), tags: tagValues })
        } catch (error) {
          setNameError(error instanceof Error ? error.message : String(error))
        }
      }
      return h('div', { className: 'rf-body' },
        h('div', { className: 'rf-setup' },
          h('div', { className: 'rf-setup-head' },
            h('div', { className: 'rf-setup-head-row' },
              h('div', { className: 'rf-setup-head-main' },
                h('div', { className: 'rf-setup-title' }, app.name || '飞书机器人'),
                h('div', { className: 'rf-setup-sub' }, `${app.appId}${bound ? ` · ${app.chatId}` : ' · 未绑定单聊'}`)),
              h('button', { type: 'button', className: 'rf-btn', onClick: onBack, disabled: binding }, '返回'))),
          h('div', { className: 'rf-setup-card' },
            h('div', { className: 'rf-setup-card-head' },
              h('div', { className: 'rf-setup-card-title' }, '基本信息'),
              h('div', { className: 'rf-setup-card-desc' }, '只影响本插件的显示和模型选择，不会修改飞书机器人应用。')),
            h('label', { className: 'rf-field' },
              h('span', { className: 'rf-label' }, '名称'),
              h('input', {
                className: 'rf-input',
                value: name,
                maxLength: 60,
                onChange: (event) => { setName(event.target.value); setNameError('') },
                onKeyDown: (event) => { if (event.key === 'Enter') { event.preventDefault(); void saveMeta() } },
                placeholder: '例如：远端DSH助理1号',
              }),
              h('span', { className: 'rf-hint' }, '显示在机器人列表和聊天页，不会修改飞书机器人应用名称。'),
              nameError ? h('div', { className: 'rf-alert' }, nameError) : null),
            h('label', { className: 'rf-field' },
              h('span', { className: 'rf-label' }, '能力描述'),
              h('textarea', {
                className: 'rf-input',
                rows: 3,
                maxLength: 500,
                value: description,
                onChange: (event) => { setDescription(event.target.value); setNameError('') },
                placeholder: '例如：远端DSH助理1号，擅长日常办公，文档处理。',
              }),
              h('span', { className: 'rf-hint' }, '供模型选择远端时参考，不会发送给飞书；最多 500 字。')),
            h('label', { className: 'rf-field' },
              h('span', { className: 'rf-label' }, '标签'),
              h('input', {
                className: 'rf-input',
                value: tags,
                onChange: (event) => { setTags(event.target.value); setNameError('') },
                placeholder: '办公, 文档',
              }),
              h('span', { className: 'rf-hint' }, '逗号分隔，最多 10 个；用于按能力筛选远端。')),
            h('div', { className: 'rf-form-actions' },
              h('button', { type: 'button', className: 'rf-btn primary', onClick: () => { void saveMeta() }, disabled: busy || binding || !name.trim() || !dirty }, '保存修改'))),
          h('div', { className: 'rf-setup-card' },
            h('div', { className: 'rf-setup-card-head' },
              h('div', { className: 'rf-setup-card-title' }, '连接与授权'),
              h('div', { className: 'rf-setup-card-desc' }, statusLine)),
            auth.warning ? h(Banner, { kind: 'warn' }, auth.warning) : null,
            auth.error ? h(Banner, { kind: 'error' }, auth.error) : null,
            authUrl ? h(Banner, { kind: 'warn' }, h('a', { href: authUrl, target: '_blank', rel: 'noreferrer' }, '浏览器拦截了授权弹窗，点此打开飞书授权页')) : null,
            binding ? h('div', { className: 'rf-binding' }, h('span', { className: 'rf-spinner' }), '正在绑定单聊…') : null,
            bindError ? h('div', { className: 'rf-alert' }, bindError) : null,
            h('div', { className: 'rf-setup-actions' },
              !authorized ? h('button', { type: 'button', className: 'rf-btn primary', onClick: onAuthorize, disabled: busy || binding }, '授权并绑定单聊') : null,
              authorized && !bound ? h('button', { type: 'button', className: 'rf-btn primary', onClick: onBind, disabled: busy || binding }, '自动绑定单聊') : null,
              bound ? h('button', { type: 'button', className: 'rf-btn', onClick: onRebind, disabled: busy || binding }, '重新绑定单聊') : null,
              authorized ? h('button', { type: 'button', className: 'rf-btn', onClick: onAuthorize, disabled: busy || binding }, '重新授权') : null,
              h('button', { type: 'button', className: 'rf-btn', onClick: onTest, disabled: busy || binding }, '测试应用')),
            h('div', { className: 'rf-setup-footer' },
              h('button', { type: 'button', className: 'rf-btn danger', onClick: onDelete, disabled: busy || binding }, '删除机器人'),
              h('div', { className: 'rf-hint' }, '只删除本插件记录，不会删除飞书机器人应用。')))))
    }

    function EmptyState({ onCreate }) {
      return h('div', { className: 'rf-empty-wrap' },
        h('div', { className: 'rf-empty' },
          h('div', { className: 'rf-empty-art' }, h(PanelIcon, { size: 34 })),
          h('div', { className: 'rf-empty-title' }, 'DSH飞书客户端'),
          h('div', { className: 'rf-empty-desc' },
            '在 DSH 里通过飞书机器人与远端智能体对话。先确认目标智能体已开通飞书接入通道并创建好飞书机器人应用；若目标是 DSH，还需安装 @cubeai/dsh-feishu-channels 插件。然后在这里保存凭据、授权并自动绑定单聊。'),
          h('button', { type: 'button', className: 'rf-btn primary', onClick: onCreate }, '添加飞书机器人')))
    }

    function Page() {
      const [apps, setApps] = useState([])
      const [selectedAppId, setSelectedAppId] = useState(() => readString(LS_APP))
      const [view, setView] = useState('empty')
      const [setupAppId, setSetupAppId] = useState('')
      const [loading, setLoading] = useState(true)
      const [busy, setBusy] = useState(false)
      const [binding, setBinding] = useState(false)
      const [error, setError] = useState('')
      const [notice, setNotice] = useState('')
      const [formError, setFormError] = useState('')
      const [bindError, setBindError] = useState('')
      const [manualChatId, setManualChatId] = useState('')
      const [messages, setMessages] = useState([])
      const [messagesLoading, setMessagesLoading] = useState(false)
      const [text, setText] = useState('')
      const [attachment, setAttachment] = useState(null)
      const [preview, setPreview] = useState(null)
      const [auth, setAuth] = useState(null)
      const [authAppId, setAuthAppId] = useState('')
      const [authLoading, setAuthLoading] = useState(true)
      const [authUrl, setAuthUrl] = useState('')
      const [usedActions, setUsedActions] = useState({})
      const [lastMeta, setLastMeta] = useState(() => readLocal(LS_LAST, {}))
      const [showJump, setShowJump] = useState(false)
      const [unread, setUnread] = useState(0)
      const [pollError, setPollError] = useState(false)
      const [clock, setClock] = useState(() => Date.now())
      const scrollRef = useRef(null)
      const textareaRef = useRef(null)
      const rootRef = useRef(null)
      const bottomRef = useRef(true)
      const lastSeenId = useRef('')
      const pollTimer = useRef(null)
      const authPoll = useRef(null)
      const loadedAppRef = useRef('')
      const messagesCacheRef = useRef(new Map())
      const selectedApp = apps.find((app) => app.id === selectedAppId) ?? null
      const setupApp = apps.find((app) => app.id === setupAppId) ?? null
      const currentAuth = authAppId === selectedApp?.id ? auth : (selectedApp?.auth ?? null)

      useLayoutEffect(() => {
        if (!selectedApp?.chatId || view !== 'chat') return
        bottomRef.current = true
        setShowJump(false)
        setUnread(0)
        const element = scrollRef.current
        if (element) element.scrollTop = element.scrollHeight
      }, [selectedApp?.id, selectedApp?.chatId, view])

      useLayoutEffect(() => {
        if (!selectedApp?.chatId || view !== 'chat' || !bottomRef.current) return
        const element = scrollRef.current
        if (element) element.scrollTop = element.scrollHeight
      }, [messages, selectedApp?.id, selectedApp?.chatId, view, authLoading, currentAuth?.authorized])

      useEffect(() => {
        const verdicts = messages.filter((message) => message.role === 'user' && isVerdictText(message.text))
        if (!verdicts.length) return
        setUsedActions((current) => {
          let changed = false
          const next = { ...current }
          for (const verdict of verdicts) {
            let target = null
            for (const message of messages) {
              if (message.role !== 'assistant') continue
              if (Number(message.createdAt) > Number(verdict.createdAt)) continue
              if (isExpiredMessage(message)) continue
              const actions = Array.isArray(message.actions) ? message.actions : []
              if (!actions.some(isApprovalAction)) continue
              if (!target || Number(message.createdAt) >= Number(target.createdAt)) target = message
            }
            if (!target) continue
            for (const action of target.actions.filter(isApprovalAction)) {
              const index = target.actions.indexOf(action)
              const key = actionKey(target, action, index)
              if (!next[key]) {
                next[key] = true
                changed = true
              }
            }
          }
          return changed ? next : current
        })
      }, [messages])

      useEffect(() => {
        if (view !== 'chat' || !selectedApp?.chatId) return
        const timer = setTimeout(() => textareaRef.current?.focus(), 120)
        return () => clearTimeout(timer)
      }, [view, selectedApp?.id, selectedApp?.chatId])

      useEffect(() => {
        if (view !== 'chat') return
        const element = rootRef.current
        if (!element) return
        const onPaste = (event) => {
          if (!event.defaultPrevented) pasteAttachment(event)
        }
        element.addEventListener('paste', onPaste)
        return () => element.removeEventListener('paste', onPaste)
      }, [view])

      const refreshState = useCallback(async () => {
        const data = await api('/state')
        const nextApps = data.apps ?? []
        setApps(nextApps)
        setSelectedAppId((current) => (current && nextApps.some((app) => app.id === current) ? current : (nextApps[0]?.id ?? '')))
        return data
      }, [])

      useEffect(() => {
        let alive = true
          ; (async () => {
            try {
              const data = await api('/state')
              if (!alive) return
              const nextApps = data.apps ?? []
              const saved = readString(LS_APP)
              const first = nextApps.find((app) => app.id === saved) ?? nextApps[0]
              setApps(nextApps)
              setSelectedAppId(first?.id ?? '')
              setAuth(first?.auth ?? null)
              setAuthAppId(first?.id ?? '')
              setAuthLoading(Boolean(first?.chatId))
              if (first) {
                setView(first.chatId ? 'chat' : 'setup')
                setSetupAppId(first.chatId ? '' : first.id)
              } else {
                setView('empty')
              }
            } catch (caught) {
              if (alive) setError(caught.message)
            } finally {
              if (alive) setLoading(false)
            }
          })()
        return () => { alive = false }
      }, [])

      useEffect(() => {
        try {
          if (selectedAppId) localStorage.setItem(LS_APP, selectedAppId)
          else localStorage.removeItem(LS_APP)
        } catch { }
      }, [selectedAppId])

      useEffect(() => {
        if (!selectedApp?.chatId) {
          setMessages([])
          setAuth(selectedApp?.auth ?? null)
          setAuthAppId(selectedApp?.id ?? '')
          setAuthLoading(false)
          setText('')
          return
        }
        const id = selectedApp.id
        const cacheKey = `${id}:${selectedApp.chatId}`
        const hasCache = messagesCacheRef.current.has(cacheKey)
        const cached = messagesCacheRef.current.get(cacheKey) ?? []
        let alive = true
        lastSeenId.current = ''
        loadedAppRef.current = ''
        bottomRef.current = true
        setMessages(cached)
        setMessagesLoading(!hasCache)
        setAuth(selectedApp.auth ?? null)
        setAuthAppId(id)
        setAuthLoading(true)
        setAuthUrl('')
        setUsedActions({})
        setShowJump(false)
        setUnread(0)
        setPollError(false)
        setError('')
        setBindError('')
        setText(readString(draftKey(id)))
        Promise.all([
          api(`/apps/${encodeURIComponent(id)}/messages`),
          api(`/apps/${encodeURIComponent(id)}/oauth/status`),
        ])
          .then(([messageData, authData]) => {
            if (!alive) return
            loadedAppRef.current = id
            const nextMessages = messageData.messages ?? []
            messagesCacheRef.current.set(cacheKey, nextMessages)
            setMessages(nextMessages)
            setAuth(authData)
            setAuthAppId(id)
          })
          .catch((caught) => { if (alive) setError(caught.message) })
          .finally(() => {
            if (!alive) return
            setMessagesLoading(false)
            setAuthLoading(false)
          })
        return () => { alive = false }
      }, [selectedApp?.id, selectedApp?.chatId])

      const mergeMessages = useCallback((incoming) => {
        if (!incoming?.length) return
        const id = selectedApp?.id
        const chatId = selectedApp?.chatId
        if (!id || !chatId) return
        const cacheKey = `${id}:${chatId}`
        setMessages((current) => {
          const next = mergeById(current, incoming)
          if (next !== current) messagesCacheRef.current.set(cacheKey, next)
          return next
        })
      }, [selectedApp?.id, selectedApp?.chatId])

      useEffect(() => {
        if (!selectedApp?.chatId) return
        let stopped = false
        let failures = 0
        const id = selectedApp.id
        const tick = async () => {
          if (stopped) return
          if (document.visibilityState !== 'visible') { schedule(2500); return }
          try {
            const data = await api(`/apps/${encodeURIComponent(id)}/messages`)
            if (stopped) return
            mergeMessages(data.messages ?? [])
            setPollError(false)
            failures = 0
            schedule(1500)
          } catch {
            if (stopped) return
            failures += 1
            setPollError(true)
            schedule(Math.min(10_000, 1500 * (failures + 1)))
          }
        }
        const schedule = (delay) => {
          if (stopped) return
          clearTimeout(pollTimer.current)
          pollTimer.current = setTimeout(tick, delay)
        }
        const onVisibility = () => {
          if (document.visibilityState === 'visible') {
            clearTimeout(pollTimer.current)
            tick()
          }
        }
        schedule(1200)
        document.addEventListener('visibilitychange', onVisibility)
        return () => {
          stopped = true
          clearTimeout(pollTimer.current)
          document.removeEventListener('visibilitychange', onVisibility)
        }
      }, [selectedApp?.id, selectedApp?.chatId, mergeMessages])

      useEffect(() => {
        const timer = setInterval(() => setClock(Date.now()), 5000)
        return () => clearInterval(timer)
      }, [])

      useEffect(() => () => {
        if (authPoll.current) {
          clearInterval(authPoll.current)
          authPoll.current = null
        }
      }, [selectedAppId, view, setupAppId])

      useEffect(() => {
        if (!selectedApp?.chatId || loadedAppRef.current !== selectedApp.id) return
        if (!messages.length) return
        const last = messages[messages.length - 1]
        setLastMeta((current) => {
          if (current[selectedApp.id]?.id === last.id) return current
          const next = { ...current, [selectedApp.id]: { id: last.id, text: last.text, at: last.createdAt } }
          writeLocal(LS_LAST, next)
          return next
        })
        const isNew = last.id !== lastSeenId.current
        lastSeenId.current = last.id
        if (!isNew) return
        if (bottomRef.current) return
        if (last.role === 'assistant') {
          setShowJump(true)
          setUnread((count) => count + 1)
        }
      }, [messages, selectedApp?.id, selectedApp?.chatId])

      function scrollToBottom(smooth = true) {
        bottomRef.current = true
        setShowJump(false)
        setUnread(0)
        const element = scrollRef.current
        if (!element) return
        element.scrollTo({ top: element.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
      }

      function onMessagesScroll() {
        const element = scrollRef.current
        if (!element) return
        const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 80
        bottomRef.current = atBottom
        if (atBottom) {
          setShowJump(false)
          setUnread(0)
        }
      }

      function handleTextChange(value) {
        setText(value)
        if (!selectedApp) return
        try {
          const key = draftKey(selectedApp.id)
          if (value) localStorage.setItem(key, value)
          else localStorage.removeItem(key)
        } catch { }
      }

      async function sendText(appId, value, options = {}) {
        if (!selectedApp || busy) return false
        const trimmed = String(value ?? '').trim()
        if (!trimmed) return false
        if (!currentAuth?.authorized) {
          setError('请先授权飞书用户。')
          return false
        }
        setBusy(true)
        setError('')
        setNotice('')
        try {
          const data = await api(`/apps/${encodeURIComponent(appId)}/messages`, {
            method: 'POST',
            body: JSON.stringify({ text: trimmed }),
          })
          if (data.message) {
            loadedAppRef.current = selectedApp.id
            setMessages((current) => {
              const next = mergeOne(current, data.message)
              messagesCacheRef.current.set(`${selectedApp.id}:${selectedApp.chatId}`, next)
              return next
            })
            bottomRef.current = true
            requestAnimationFrame(() => scrollToBottom(true))
          }
          if (!options.fromAction) {
            setText('')
            try { localStorage.removeItem(draftKey(selectedApp.id)) } catch { }
            requestAnimationFrame(() => textareaRef.current?.focus())
          }
          return true
        } catch (caught) {
          setError(caught.message)
          return false
        } finally {
          setBusy(false)
        }
      }

      function clearAttachment() {
        setAttachment((current) => {
          if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl)
          return null
        })
      }

      function selectAttachment(file) {
        if (!file) return
        const kind = attachmentKindFromFile(file)
        const limit = kind === 'image' ? 10 * 1024 * 1024 : 30 * 1024 * 1024
        if (!file.size) { setError('不能发送空文件。'); return }
        if (file.size > limit) {
          setError(kind === 'image' ? '图片不能超过 10MB。' : '文件不能超过 30MB。')
          return
        }
        const previewUrl = kind === 'image' ? URL.createObjectURL(file) : ''
        setAttachment((current) => {
          if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl)
          return {
            file,
            kind,
            name: file.name || 'file',
            size: file.size,
            mime: file.type || '',
            previewUrl,
          }
        })
        setError('')
      }

      function pasteAttachment(event) {
        const clipboard = event.clipboardData
        if (!clipboard) return
        const files = []
        for (const item of Array.from(clipboard.items ?? [])) {
          if (item.kind !== 'file') continue
          const picked = item.getAsFile()
          if (picked) files.push(picked)
        }
        if (files.length === 0) {
          for (const picked of Array.from(clipboard.files ?? [])) files.push(picked)
        }
        if (files.length === 0) return
        event.preventDefault()
        let file = files[0]
        if (!file.name) {
          const ext = (file.type.split('/')[1] || 'bin').replace('jpeg', 'jpg')
          file = new File([file], `pasted-${Date.now()}.${ext}`, { type: file.type || 'application/octet-stream' })
        }
        selectAttachment(file)
      }

      async function uploadAttachment(appId, next) {
        const query = new URLSearchParams({
          kind: next.kind,
          name: next.name,
          mime: next.mime || 'application/octet-stream',
        })
        const response = await fetch(`${API}/apps/${encodeURIComponent(appId)}/media?${query.toString()}`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'x-dsh-feishu-client': '1',
            'content-type': next.mime || 'application/octet-stream',
          },
          body: next.file,
        })
        let data = null
        try { data = await response.json() } catch { }
        if (!response.ok || !data || data.ok === false || !data.attachment) {
          throw new Error(data?.error ?? `附件上传失败（HTTP ${response.status}）`)
        }
        return data.attachment
      }

      async function sendWithAttachment() {
        if (!selectedApp || busy || !attachment) return false
        if (!currentAuth?.authorized) {
          setError('请先授权飞书用户。')
          return false
        }
        setBusy(true)
        setError('')
        setNotice('')
        try {
          const uploaded = await uploadAttachment(selectedApp.id, attachment)
          const data = await api(`/apps/${encodeURIComponent(selectedApp.id)}/messages`, {
            method: 'POST',
            body: JSON.stringify({ text: text.trim(), attachment: uploaded }),
          })
          const sent = data.messages ?? (data.message ? [data.message] : [])
          if (sent.length) {
            loadedAppRef.current = selectedApp.id
            setMessages((current) => {
              const next = mergeById(current, sent)
              messagesCacheRef.current.set(`${selectedApp.id}:${selectedApp.chatId}`, next)
              return next
            })
            bottomRef.current = true
            requestAnimationFrame(() => scrollToBottom(true))
          }
          const attachmentSent = data.attachmentSent !== false
          setText('')
          try { localStorage.removeItem(draftKey(selectedApp.id)) } catch { }
          if (attachmentSent) {
            clearAttachment()
            setNotice(data.warning || '已发送。')
          } else {
            setError(data.warning || '附件发送失败，文字已发送。')
          }
          requestAnimationFrame(() => textareaRef.current?.focus())
          return attachmentSent
        } catch (caught) {
          setError(caught.message)
          return false
        } finally {
          setBusy(false)
        }
      }

      function previewAttachment(messageId, item) {
        if (!selectedApp || !item) return
        const base = { ...item, fileKey: item.fileKey || item.imageKey }
        const url = resourceUrl(selectedApp.id, messageId, base)
        const downloadUrl = resourceUrl(selectedApp.id, messageId, base, true)
        if (!url) return
        setPreview({
          kind: item.kind === 'sticker' ? 'image' : item.kind,
          url,
          downloadUrl,
          name: item.name || '附件',
        })
      }

      async function handleAction(message, action, index) {
        const key = actionKey(message, action, index)
        const approval = isApprovalAction(action)
        const approvalActions = approval && Array.isArray(message.actions)
          ? message.actions.filter(isApprovalAction)
          : []
        const approvalKeys = approvalActions.map((item) => actionKey(message, item, message.actions.indexOf(item)))
        if (approval ? approvalKeys.some((item) => usedActions[item]) : usedActions[key]) return
        if (action.url) {
          window.open(action.url, '_blank', 'noreferrer')
          return
        }
        const markKeys = approval && approvalKeys.length ? approvalKeys : [key]
        setUsedActions((current) => {
          const next = { ...current }
          for (const item of markKeys) next[item] = true
          return next
        })
        const value = approvalActionValue(action)
          || (typeof action.text === 'string' && action.text.trim() ? action.text : '')
          || String((action.index !== undefined ? action.index : index) + 1)
        const ok = await sendText(selectedApp?.id, value, { fromAction: true })
        if (!ok) {
          setUsedActions((current) => {
            const next = { ...current }
            for (const item of markKeys) delete next[item]
            return next
          })
        }
      }

      async function authorize(appId, options = {}) {
        if (!appId) return
        setBusy(true)
        setError('')
        setNotice('')
        setAuthUrl('')
        const popup = window.open('about:blank', 'dsh-feishu-client-oauth', 'width=560,height=760')
        try {
          const desktop = typeof document !== 'undefined' && /^dsh-app:\/\//i.test(document.baseURI)
          const authBase = desktop && typeof document !== 'undefined' ? document.baseURI : BASE
          const data = await api(`/apps/${encodeURIComponent(appId)}/oauth/start?base=${encodeURIComponent(authBase)}${desktop ? '&desktop=1' : ''}`)
          if (popup) popup.location.href = data.url
          else {
            setAuthUrl(data.url)
            setNotice('浏览器拦截了弹窗，请点击上方链接完成授权。')
          }
          if (authPoll.current) clearInterval(authPoll.current)
          const started = Date.now()
          authPoll.current = setInterval(async () => {
            try {
              const status = await api(`/apps/${encodeURIComponent(appId)}/oauth/status`)
              if (status.authorized) {
                clearInterval(authPoll.current)
                authPoll.current = null
                if (selectedApp?.id === appId) {
                  setAuth(status)
                  setAuthAppId(appId)
                }
                setAuthUrl('')
                setNotice(status.warning ? status.warning : '授权成功。')
                await refreshState()
                if (options.autoBind) await bindChat(appId)
              }
            } catch { }
            if (Date.now() - started > 5 * 60_000) {
              clearInterval(authPoll.current)
              authPoll.current = null
            }
          }, 1200)
        } catch (caught) {
          if (popup) popup.close()
          setError(caught.message)
        } finally {
          setBusy(false)
        }
      }

      async function bindChat(appId, options = {}) {
        if (!appId) return
        const app = apps.find((item) => item.id === appId)
        if (app?.chatId && !options.force) {
          selectApp(app)
          return
        }
        if (options.manual && !manualChatId.trim()) {
          setBindError('请填写 Chat ID。')
          return
        }
        setBinding(true)
        setBindError('')
        setError('')
        try {
          const data = options.manual
            ? await api(`/apps/${encodeURIComponent(appId)}/chat`, { method: 'POST', body: JSON.stringify({ chatId: manualChatId.trim() }) })
            : await api(`/apps/${encodeURIComponent(appId)}/discover-chat`, { method: 'POST', body: '{}' })
          await refreshState()
          clearAttachment()
          setPreview(null)
          setSelectedAppId(appId)
          setSetupAppId('')
          setManualChatId('')
          setView('chat')
          setNotice(data.created ? '已绑定单聊。' : '单聊已更新。')
        } catch (caught) {
          setBindError(caught.message)
        } finally {
          setBinding(false)
        }
      }

      async function createApp(form) {
        setBusy(true)
        setFormError('')
        setError('')
        setNotice('')
        try {
          const data = await api('/apps', { method: 'POST', body: JSON.stringify(form) })
          await refreshState()
          setSetupAppId(data.app.id)
          setView('setup')
          setAuthUrl('')
          setManualChatId('')
          setBindError('')
          setNotice('应用已保存。请授权并自动绑定单聊。')
        } catch (caught) {
          setFormError(caught.message)
        } finally {
          setBusy(false)
        }
      }

      function selectApp(app) {
        clearAttachment()
        setPreview(null)
        setSelectedAppId(app.id)
        setAuth(app.auth ?? null)
        setAuthAppId(app.id)
        setAuthLoading(Boolean(app.chatId))
        bottomRef.current = true
        setAuthUrl('')
        setBindError('')
        if (app.chatId) {
          const cacheKey = `${app.id}:${app.chatId}`
          if (messagesCacheRef.current.has(cacheKey)) {
            setMessages(messagesCacheRef.current.get(cacheKey))
            setMessagesLoading(false)
          } else {
            setMessages([])
            setMessagesLoading(true)
          }
          setView('chat')
          setSetupAppId('')
        } else {
          setView('setup')
          setSetupAppId(app.id)
          setManualChatId('')
        }
      }

      async function updateApp(appId, patch) {
        setBusy(true)
        setError('')
        try {
          const data = await api(`/apps/${encodeURIComponent(appId)}`, {
            method: 'PATCH',
            body: JSON.stringify(patch),
          })
          await refreshState()
          setNotice('设置已更新。')
          return data.app
        } finally {
          setBusy(false)
        }
      }

      async function deleteApp(appId) {
        if (!window.confirm('删除这个机器人？本插件记录、授权和单聊绑定都会删除；飞书机器人应用和飞书侧聊天记录不受影响。')) return
        setBusy(true)
        setError('')
        try {
          await api(`/apps/${encodeURIComponent(appId)}`, { method: 'DELETE' })
          const data = await refreshState()
          clearAttachment()
          setPreview(null)
          setSetupAppId('')
          const next = data.apps?.[0]
          setSelectedAppId(next?.id ?? '')
          setView(next ? (next.chatId ? 'chat' : 'setup') : 'empty')
          if (next && !next.chatId) setSetupAppId(next.id)
          setNotice('机器人已删除。')
        } catch (caught) {
          setError(caught.message)
        } finally {
          setBusy(false)
        }
      }

      async function testApp(appId) {
        if (!appId) return
        setBusy(true)
        setError('')
        setNotice('')
        try {
          const data = await api(`/apps/${encodeURIComponent(appId)}/test`, { method: 'POST', body: '{}' })
          setNotice(`连接正常${data.bot?.name ? `：${data.bot.name}` : ''}${data.authorized ? '，已授权' : '，未授权'}${data.chatBound ? '，已绑定单聊' : '，未绑定单聊'}`)
        } catch (caught) {
          setError(caught.message)
        } finally {
          setBusy(false)
        }
      }

      async function reloadMessages() {
        if (!selectedApp?.chatId) return
        setBusy(true)
        setError('')
        try {
          const [messageData, authData] = await Promise.all([
            api(`/apps/${encodeURIComponent(selectedApp.id)}/messages`),
            api(`/apps/${encodeURIComponent(selectedApp.id)}/oauth/status`),
          ])
          loadedAppRef.current = selectedApp.id
          const nextMessages = messageData.messages ?? []
          messagesCacheRef.current.set(`${selectedApp.id}:${selectedApp.chatId}`, nextMessages)
          setMessages(nextMessages)
          setAuth(authData)
          setAuthAppId(selectedApp.id)
        } catch (caught) {
          setError(caught.message)
        } finally {
          setBusy(false)
        }
      }

      const last = messages[messages.length - 1]
      const typing = Boolean(last && last.role === 'user' && currentAuth?.authorized && clock - last.createdAt < 120_000)
      const authorized = Boolean(currentAuth?.authorized)

      return h('div', { className: 'rf-root', ref: rootRef },
        h('style', null, css),
        h('aside', { className: 'rf-side' },
          h('div', { className: 'rf-side-head' },
            h('button', {
              type: 'button',
              className: 'rf-btn ghost block',
              onClick: () => {
                setView('new')
                setFormError('')
                setError('')
                setNotice('')
                setSetupAppId('')
                setBindError('')
              },
            }, '＋ 添加飞书机器人')),
          h('div', { className: 'rf-list' },
            loading
              ? h('div', { className: 'rf-side-hint' }, '加载中…')
              : apps.length
                ? apps.map((app) => h(AppRow, {
                  key: app.id,
                  app,
                  active: (view === 'chat' || view === 'setup') && app.id === selectedAppId,
                  meta: lastMeta[app.id],
                  onClick: () => selectApp(app),
                }))
                : h('div', { className: 'rf-side-hint' }, '还没有飞书机器人。\n点上方按钮，按准备清单添加飞书机器人；授权后会自动绑定单聊。'))),
        h('main', { className: 'rf-main' },
          error ? h(Banner, { kind: 'error', onClose: () => setError('') }, error) : null,
          notice ? h(Banner, { kind: 'success', onClose: () => setNotice('') }, notice) : null,
          view === 'new'
            ? h('div', { className: 'rf-body' },
              h(AppForm, {
                busy,
                error: formError,
                onCreate: createApp,
                onCancel: () => { setView(selectedApp ? (selectedApp.chatId ? 'chat' : 'setup') : 'empty'); setFormError('') },
              }))
            : view === 'setup' && setupApp
              ? h(AppSetup, {
                app: setupApp,
                busy,
                binding,
                bindError,
                authUrl,
                onAuthorize: () => { void authorize(setupApp.id, { autoBind: true }) },
                onBind: () => { void bindChat(setupApp.id) },
                onRebind: () => { void bindChat(setupApp.id, { force: true }) },
                onUpdate: (patch) => updateApp(setupApp.id, patch),
                onDelete: () => { void deleteApp(setupApp.id) },
                onBack: () => { setView(selectedApp?.chatId ? 'chat' : 'empty'); setSetupAppId(''); setAuthUrl('') },
                onTest: () => { void testApp(setupApp.id) },
              })
              : view === 'chat' && selectedApp?.chatId
                ? h(ChatView, {
                  app: selectedApp,
                  auth: currentAuth,
                  authLoading,
                  messages,
                  messagesLoading,
                  text,
                  setText: handleTextChange,
                  busy,
                  authorized,
                  onSend: () => {
                    if (attachment) void sendWithAttachment()
                    else void sendText(selectedApp.id, text)
                  },
                  onRefresh: () => { void reloadMessages() },
                  onAuthorize: () => { void authorize(selectedApp.id, { autoBind: false }) },
                  onSettings: () => { setView('setup'); setSetupAppId(selectedApp.id); setAuthUrl(''); setBindError('') },
                  authUrl,
                  pollError,
                  usedActions,
                  onAction: (message, action, index) => { void handleAction(message, action, index) },
                  showJump,
                  unread,
                  onJump: () => scrollToBottom(true),
                  typing,
                  scrollRef,
                  onScroll: onMessagesScroll,
                  textareaRef,
                  attachment,
                  onAttach: selectAttachment,
                  onRemoveAttachment: clearAttachment,
                  onPreview: (messageId, item) => previewAttachment(messageId, item),
                })
                : h(EmptyState, { onCreate: () => setView('new') })),
        h(MediaModal, { preview, onClose: () => setPreview(null) }))
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 20,
          label: 'DSH飞书客户端',
        }, PanelIcon))
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
        }, Page))
      },
    }
  },
})
