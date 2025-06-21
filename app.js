const puppeteer = require('puppeteer');
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const proxyPlugin = require('puppeteer-extra-plugin-proxy');

puppeteerExtra.use(StealthPlugin());

puppeteerExtra.use(proxyPlugin({
  address: 'gw.dataimpulse.com',
  port: 823,
  credentials: {
    username: 'e1f2bc8aaceece88bf6f',
    password: '6fe62268a51a4085'
  }
}));


const userData = {
  wassit: '170499004650',
  identity: '109990612004650001',
};


const PAGE_ACCESS_TOKEN = 'EAANgiDeZCIlsBOZCDSVE0PSzHNfq63Cd5T3Hm6jMJTmdZAnWMigPDFtFpUoXZCZByFHr8KL3ZBXeDRJZBPk61gM9H4okmMTm1jguFhd666ZBp2BSbNdHxPkeWtL0uz0uEdaWxdBopYKkmqMa2VQ8i4qLpJjqivBhatGdo50A4SvSn7Eg1T63CU6FJZAJqe0oPuxUzv3z3414OhQZDZD';
const ADMIN_PSID = '24315834388019420';

let hadRendezVous = false;
let lastPingTime = Date.now();

async function sendFacebookMessage(text) {
  try {
    await axios.post(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
      messaging_type: 'RESPONSE',
      recipient: { id: ADMIN_PSID },
      message: { text }
    });
  } catch (error) {
    console.error('❌ فشل في إرسال رسالة فيسبوك:', error.response?.data || error.message);
  }
}

async function checkAppointmentStatus() {
const browser = await puppeteerExtra.launch({
  headless: true,
  executablePath: puppeteer.executablePath(), // ✅ هنا استخدم المسار من puppeteer
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});



  const page = await browser.newPage();

  try {
    await page.goto('https://minha.anem.dz/pre_inscription', { waitUntil: 'domcontentloaded', timeout: 60000 });

    await page.waitForSelector('input[name="numeroWassit"]', { timeout: 20000 });
    await page.type('input[name="numeroWassit"]', userData.wassit, { delay: 50 });
    await page.type('input[name="numeroPieceIdentite"]', userData.identity, { delay: 50 });

    await page.click('button[type="submit"]');

    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('المواصلة')),
      { timeout: 15000 }
    );

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('المواصلة'));
      if (btn) btn.click();
    });

    // ننتظر قليلاً لظهور الرسالة
    await new Promise(resolve => setTimeout(resolve, 3000));

    let resultText = '';
    try {
      await page.waitForSelector('.MuiAlert-message', { timeout: 10000 });
      resultText = await page.$eval('.MuiAlert-message', el => el.innerText.trim());
    } catch (e) {
      console.log('📭 لم تظهر رسالة تنبيه - ربما لا يوجد موعد أو تم تغيير التصميم.');
    }

    if (resultText.includes('لا يوجد') || resultText.includes('نعتذر')) {
      hadRendezVous = false;
      console.log("❌ لا يوجد موعد حاليًا - الرسالة:", resultText);
    } else if (resultText) {
      if (!hadRendezVous) {
        await sendFacebookMessage('📢 تم تحديد موعد لك في منحة البطالة!\n\n' + resultText);
        hadRendezVous = true;
        console.log("✅ يوجد موعد - الرسالة:", resultText);
      }
    }

    // 🕐 إرسال رسالة كل ساعة لتأكيد أن السكربت يعمل
    if (Date.now() - lastPingTime >= 1000 * 60 * 60) {
      await sendFacebookMessage('✅ السكربت لا يزال يعمل بشكل طبيعي.');
      lastPingTime = Date.now();
    }

  } catch (err) {
    console.error('⚠️ خطأ أثناء التصفح:', err.message);
    await page.screenshot({ path: 'error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

checkAppointmentStatus();
setInterval(checkAppointmentStatus, 1000 * 60 * 30); // فحص كل 30 دقيقة
