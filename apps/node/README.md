# Node.js 版本

Node.js 环境运行的森空岛自动签到服务，可以使用 Github Action 每日自动执行。~~或者是 Docker 进行每日自动执行（未制作）~~

## 特点

- 💰 完全免费，无需服务器，但是需要注意因为不活跃而被 Github 自动禁用
- 🧵 使用 GitHub Actions 定时执行，出现错误需要手动重试

## 使用

[Fork 本项目](https://github.com/enpitsuLin/skland-daily-attendance/fork)

## 配置

### 获取凭据

登录 [森空岛网页版](https://www.skland.com/) 后，打开 https://web-api.skland.com/account/info/hg 记下 content 字段的值

或者登录 [鹰角网络通行证](https://user.hypergryph.com/login) 后打开 https://web-api.hypergryph.com/account/info/hg 记下 content 字段的值

### 添加至仓库 Secrets

在 Fork 的仓库中，进入 Settings -> Secrets and variables -> Actions -> New repository secret

建立名为 `SKLAND_TOKEN` 的 secret，值为上一步获取 content，最后点击 Add secret，如果需要多账号支持，请使用半角逗号`,`分割

---

## 明日方舟签到配置项

| 环境变量 / Secret | 必填 | 说明 |
|---|---|---|
| `SKLAND_TOKEN` | ✅ | 明日方舟账号的 token，多账号用半角逗号 `,` 分隔 |
| `SERVERCHAN_SENDKEY` | ❌ | Server 酱推送密钥 |
| `BARK_URL` | ❌ | Bark 推送 URL（需以 `https://` 开头） |
| `MESSAGE_PUSHER_URL` | ❌ | MessagePusher WebHook URL（需以 `https://` 开头） |
| `QMSG_SENDKEY` | ❌ | Qmsg 酱推送密钥 |
| `QMSG_QQ` | ❌ | Qmsg 推送目标 QQ 号，多个用半角逗号 `,` 分隔 |
| `MAX_RETRIES` | ❌ | 错误重试次数，默认 `3` |

> 所有推送渠道并行独立执行，单个渠道失败不影响其他渠道。

---

## 终末地签到配置项

终末地签到使用独立的入口和配置，与明日方舟签到互不影响。

| 环境变量 / Secret | 必填 | 说明 |
|---|---|---|
| `SKLAND_ENDFIELD_TOKEN` | ✅ | 终末地账号的 token（获取方式同上），多账号用半角逗号 `,` 分隔 |
| `ENDFIELD_SERVERCHAN_SENDKEY` | ❌ | 终末地专用 Server 酱推送密钥，未设置则回退到 `SERVERCHAN_SENDKEY` |
| `ENDFIELD_BARK_URL` | ❌ | 终末地专用 Bark 推送 URL，未设置则回退到 `BARK_URL` |
| `ENDFIELD_MESSAGE_PUSHER_URL` | ❌ | 终末地专用 MessagePusher URL，未设置则回退到 `MESSAGE_PUSHER_URL` |
| `ENDFIELD_QMSG_SENDKEY` | ❌ | 终末地专用 Qmsg 酱推送密钥，未设置则回退到 `QMSG_SENDKEY` |
| `QMSG_ENDFIELD_QQ` | ❌ | 终末地推送目标 QQ 号，多个用半角逗号 `,` 分隔 |
| `MAX_RETRIES` | ❌ | 错误重试次数，默认 `3` |

---

## 邮件回退配置（通用）

当所有推送渠道均失败时，系统会尝试通过邮件发送通知。需同时配置以下所有必填项才会启用：

| 环境变量 / Secret | 必填 | 说明 |
|---|---|---|
| `SMTP_HOST` | ✅ | SMTP 服务器地址，如 `smtp.qq.com` |
| `SMTP_PORT` | ❌ | SMTP 端口，默认 `465` |
| `SMTP_SECURE` | ❌ | 是否使用 TLS，默认 `true`，设为 `false` 关闭 |
| `SMTP_USER` | ✅ | 发件邮箱地址 |
| `SMTP_PASS` | ✅ | 邮箱密码或授权码 |
| `EMAIL_TO` | ✅ | 收件人邮箱地址 |

---

## GitHub Actions

### 明日方舟签到

> Actions 默认为关闭状态，Fork 之后需要手动执行一次，若成功运行其才会激活。

返回项目主页面，点击上方的`Actions`，再点击左侧的`attendance`，再点击`Run workflow`

### 终末地签到

在仓库 Settings -> Secrets 中添加上述 secret 后，进入 Actions 页面，找到 `endfield-attendance` 工作流，点击 `Run workflow` 手动执行一次即可激活。

> 本仓库使用了 `Actions` 自动活跃工作流，需要手动执行一次，之后就不用管 `Actions` 了

---

## 本地运行

1. 在项目根目录安装依赖：

```bash
pnpm install
```

2. 在 `apps/node` 目录下创建 `.env` 文件，按需填入配置项：

```env
# 明日方舟
SKLAND_TOKEN=你的token

# 终末地
SKLAND_ENDFIELD_TOKEN=你的token

# 推送渠道（按需配置）
SERVERCHAN_SENDKEY=你的sendkey
BARK_URL=https://your-bark-url
MESSAGE_PUSHER_URL=https://your-webhook-url
QMSG_SENDKEY=你的sendkey
QMSG_QQ=目标QQ号

# 终末地专用推送（可选，未设置时回退到上面的通用配置）
ENDFIELD_QMSG_SENDKEY=终末地专用sendkey
QMSG_ENDFIELD_QQ=目标QQ号

# 邮件回退（可选）
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your@email.com
SMTP_PASS=your-password
EMAIL_TO=receiver@email.com
```

3. 运行签到：

```bash
# 明日方舟签到
pnpm -C apps/node start

# 终末地签到
pnpm -C apps/node start:endfield
```

## Docker 运行

🕊 咕咕咕
