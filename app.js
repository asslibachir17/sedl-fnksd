import { Telegraf } from "telegraf";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import input from "input";
import random from "lodash.random";
import fs from "fs";

// تصحيح استيراد lowdb حسب النسخة الحديثة (v3+)
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

const botToken = "7546872557:AAEg0mZf9-UysAmigOcb8k6RLcHibxXOogU";
const apiId = 24078335;
const apiHash = "cba90924bd3a9957d602f369368bed4d";

const bot = new Telegraf(botToken);

let db;

async function main() {
  const adapter = new JSONFile("sessions.json");
  db = new Low(adapter);

  await db.read();
  db.data ||= { users: {} };

  bot.start((ctx) => ctx.reply("👋 أهلاً! استخدم /add لإضافة حساب."));

  const waitingForPhone = new Set();

  bot.command("add", (ctx) => {
    const userId = ctx.from.id;
    ctx.reply("📱 أرسل رقم هاتفك مع رمز الدولة (مثال: +213xxxxxxxxx):");
    waitingForPhone.add(userId);
  });

  bot.on("text", async (ctx) => {
    const userId = ctx.from.id;
    if (!waitingForPhone.has(userId)) return;

    const phoneNumber = ctx.message.text.trim();
    waitingForPhone.delete(userId);

    const stringSession = new StringSession("");
    const client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });

    try {
      await client.start({
        phoneNumber: () => Promise.resolve(phoneNumber),
        password: () => input.text("🔐 كلمة مرور 2FA: "),
        phoneCode: () => input.text("💬 أدخل كود التحقق: "),
        onError: (err) => console.log("❌ خطأ:", err),
      });

      const session = client.session.save();

      db.data.users[userId] ||= [];
      db.data.users[userId].push({ phone: phoneNumber, session });
      await db.write();

      await ctx.reply("✅ تم حفظ الجلسة بنجاح!");

      startSessionWatcher(phoneNumber, session);

      await client.disconnect();
    } catch (e) {
      console.error("❌ فشل التسجيل:", e);
      await ctx.reply("❌ حدث خطأ أثناء تسجيل الدخول.");
    }
  });

  bot.command("list", (ctx) => {
    const userId = ctx.from.id;
    const userSessions = db.data.users[userId] || [];
    if (userSessions.length === 0) {
      return ctx.reply("❌ لا توجد حسابات مضافة.");
    }

    let msg = "📱 حساباتك:\n";
    userSessions.forEach((s, i) => {
      msg += `#${i + 1} - ${s.phone}\n`;
    });

    ctx.reply(msg);
  });

  await bot.launch();
  console.log("🤖 بوت تيليجرام يعمل...");

  for (const sessions of Object.values(db.data.users)) {
    for (const { phone, session } of sessions) {
      startSessionWatcher(phone, session);
    }
  }

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

const replyMessages = [
  "📢 للحصول على 2 جيغا جيزي ادخل إلى حسابي وستجد البوت في البايو.",
  "🤖 البوت تفعيل 2 جيغا الآن! ادخل بوت من البايو الخاص بالحساب.",
  "✅ للاستفادة من 2 جيغا جيزي توجه إلى بوت الرابط في البايو.",
  "📌 ادخل إلى حسابي في البايو ستجد هناك رابط البوت تفعيل 2 جيغا",
  "📲 تفعيل 2جيغا اسبوعية متوفرة داخل بوت الرابط موجود في بايو الحساب."
];

const phoneRegex = /\b(07\d{8}|\+213\d{9})\b/;

async function startSessionWatcher(phone, sessionStr) {
  const stringSession = new StringSession(sessionStr);
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  try {
    await client.start();
    console.log(`✅ جلسة ${phone} تعمل.`);

    client.addEventHandler(async (event) => {
      const message = event.message;
      const text = message.message;

      if (!message.peerId || message.isPrivate) return;

      const match = text.match(phoneRegex);
      if (match) {
        const delay = random(40, 120);
        console.log(`📞 [${phone}] رقم مكتشف (${match[0]}), سيتم الرد بعد ${delay} ثانية.`);

        setTimeout(async () => {
          const replyText =
            replyMessages[Math.floor(Math.random() * replyMessages.length)];
          try {
            await client.sendMessage(message.chatId, {
              message: replyText,
              replyTo: message.id,
            });
            console.log(`📨 [${phone}] تم الرد بنجاح.`);
          } catch (err) {
            console.error(`❌ [${phone}] خطأ في الرد:`, err.message);
          }
        }, delay * 1000);
      }
    }, new NewMessage({}));
  } catch (err) {
    console.error(`❌ فشل تشغيل جلسة ${phone}:`, err.message);
  }
}

main().catch(console.error);
