import { createTransport } from 'nodemailer'
import type { EmailConfig } from './push'

export async function sendEmail(config: EmailConfig, title: string, content: string): Promise<boolean> {
  try {
    const transporter = createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    })

    await transporter.sendMail({
      from: config.user,
      to: config.to,
      subject: title,
      text: content,
    })

    console.log(`[Email] 邮件发送成功 -> ${config.to}`)
    return true
  }
  catch (error) {
    console.error(`[Email] 邮件发送失败: ${error}`)
    return false
  }
}
