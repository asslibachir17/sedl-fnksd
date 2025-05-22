const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const input = require("input");
const random = require("lodash.random");

const apiId = 24078335;
const apiHash = "cba90924bd3a9957d602f369368bed4d";
const stringSession = new StringSession(""); // احفظ الجلسة هنا إن وُجدت

// رسائل بدون أزرار وتوجه المستخدم إلى البايو
const replyMessages = [
  "📢 للحصول على 2 جيغا جيزي ادخل إلى حسابي وستجد البوت في البايو.",
  "🤖 البوت تفعيل 2 جيغا الآن! ادخل بوت من البايو الخاص بالحساب.",
  "✅ للاستفادة من 2 جيغا جيزي توجه إلى بوت الرابط في البايو.",
  "📌 ادخل إلى حسابي في البايو ستجد هناك رابط البوت تفعيل 2 جيغا",
  "📲 تفعيل 2جيغا اسبوعية متوفرة داخل بوت الرابط موجود في بايو الحساب."
];

const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
});

(async () => {
  console.log("🔐 تسجيل الدخول...");
  await client.start({
    phoneNumber: async () => await input.text("📱 أدخل رقم الهاتف: "),
    password: async () => await input.text("🔐 كلمة مرور 2FA (إن وجدت): "),
    phoneCode: async () => await input.text("💬 أدخل الكود المرسل: "),
    onError: (err) => console.log(err),
  });

  console.log("✅ تم تسجيل الدخول");
  console.log("⚡ الجلسة المحفوظة:", client.session.save());

  client.addEventHandler(async (event) => {
    const message = event.message;
    const text = message.message;

    if (!message.peerId || message.isPrivate) return;

    const match = text.match(/\b07\d{8}\b/);
    if (match) {
      const delay = random(40, 120);
      console.log(`📞 رقم هاتف مكتشف، سيتم الرد خلال ${delay} ثانية...`);

      setTimeout(async () => {
        const replyText = replyMessages[Math.floor(Math.random() * replyMessages.length)];
        try {
          await client.sendMessage(message.chatId, {
            message: replyText,
            replyTo: message.id, // الرد مباشرة على الرسالة
          });
          console.log("📨 تم الرد على الرسالة.");
        } catch (err) {
          console.error("❌ فشل في إرسال الرد:", err);
        }
      }, delay * 1000);
    }
  }, new NewMessage({}));

  console.log("🤖 البوت يعمل الآن...");
})();
