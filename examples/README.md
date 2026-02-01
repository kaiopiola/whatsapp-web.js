# WhatsApp Bot Examples

This directory contains examples to help you get started with whatsapp-web.js in your project.

## Quick Start

### 1. Install in Your Project

```bash
# Navigate to your project directory
cd /path/to/your/project

# Install this package
npm install /path/to/whatsapp-web.js

# Install qrcode-terminal (optional, for QR display)
npm install qrcode-terminal
```

### 2. Copy Example File

```bash
# Copy the simple bot example to your project
cp /path/to/whatsapp-web.js/examples/simple-bot.js ./whatsapp-bot.js
```

### 3. Run the Bot

```bash
node whatsapp-bot.js
```

### 4. Scan QR Code

When the QR code appears in the terminal:
1. Open WhatsApp on your phone
2. Go to Settings → Linked Devices
3. Tap "Link a Device"
4. Scan the QR code

### 5. Test the Bot

Send a message to the connected number with:
- `!ping` - Test if bot is responding
- `!help` - See available commands
- `!info` - Get your information

## Troubleshooting

### Bot not receiving messages

**Check if events are firing:**

```javascript
client.on('ready', () => {
    console.log('✅ Ready event fired!');
});

client.on('message', (msg) => {
    console.log('✅ Message event fired!', msg.body);
});
```

If you see `Ready event fired!` but NOT `Message event fired!`, check:

1. **Make sure you're using the updated version** with the fixes from CHANGES.md
2. **Restart the bot** completely (stop and start again)
3. **Delete authentication data** and re-scan QR:
   ```bash
   rm -rf ./.wwebjs_auth
   node whatsapp-bot.js
   ```

### Common Issues

#### Issue: "Cannot find module 'whatsapp-web.js'"

**Solution:**
```bash
# Make sure you installed the package
npm install /path/to/whatsapp-web.js

# Or add to package.json
{
  "dependencies": {
    "whatsapp-web.js": "file:../whatsapp-web.js"
  }
}
```

#### Issue: QR Code not appearing

**Solution:**
```bash
# Install qrcode-terminal
npm install qrcode-terminal
```

#### Issue: Session keeps expiring

**Solution:** Use LocalAuth with a persistent path:
```javascript
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'  // This folder will store session
    })
});
```

## Integration Example

Here's how to integrate the bot into your existing project:

### Option 1: As a Module

**bot.js:**
```javascript
const { Client, LocalAuth } = require('whatsapp-web.js');

class WhatsAppBot {
    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth()
        });
        this.isReady = false;
    }

    async start() {
        this.client.on('ready', () => {
            this.isReady = true;
            console.log('Bot ready!');
        });

        this.client.on('message', async (msg) => {
            // Your message handling logic
            await this.handleMessage(msg);
        });

        await this.client.initialize();
    }

    async handleMessage(msg) {
        if (msg.body === '!ping') {
            await msg.reply('Pong!');
        }
    }

    async sendMessage(number, text) {
        if (!this.isReady) {
            throw new Error('Client not ready');
        }
        await this.client.sendMessage(`${number}@c.us`, text);
    }
}

module.exports = WhatsAppBot;
```

**app.js:**
```javascript
const WhatsAppBot = require('./bot');

const bot = new WhatsAppBot();
bot.start();

// Use it in your application
setTimeout(async () => {
    await bot.sendMessage('5511999999999', 'Hello from my app!');
}, 5000);
```

### Option 2: As a Service

**services/whatsapp.service.js:**
```javascript
const { Client, LocalAuth } = require('whatsapp-web.js');

class WhatsAppService {
    constructor() {
        this.client = null;
        this.isReady = false;
    }

    async initialize() {
        this.client = new Client({
            authStrategy: new LocalAuth()
        });

        return new Promise((resolve, reject) => {
            this.client.on('qr', (qr) => {
                console.log('QR Code:', qr);
            });

            this.client.on('ready', () => {
                this.isReady = true;
                console.log('WhatsApp Service ready!');
                resolve();
            });

            this.client.on('auth_failure', (err) => {
                reject(err);
            });

            this.client.on('message', async (msg) => {
                await this.onMessage(msg);
            });

            this.client.initialize();
        });
    }

    async onMessage(msg) {
        // Override this method in your implementation
        console.log('Message received:', msg.body);
    }

    async send(to, message) {
        if (!this.isReady) {
            throw new Error('WhatsApp service not ready');
        }
        return await this.client.sendMessage(to, message);
    }

    async destroy() {
        if (this.client) {
            await this.client.destroy();
        }
    }
}

module.exports = new WhatsAppService();
```

**app.js:**
```javascript
const whatsappService = require('./services/whatsapp.service');

// Initialize on app start
async function startApp() {
    try {
        await whatsappService.initialize();
        console.log('App started with WhatsApp integration');

        // Now you can use it anywhere
        await whatsappService.send('5511999999999@c.us', 'Hello!');

    } catch (error) {
        console.error('Failed to start WhatsApp service:', error);
    }
}

startApp();
```

### Option 3: With Express API

**server.js:**
```javascript
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
app.use(express.json());

let whatsappClient;
let isReady = false;
let qrCodeData = '';

// Initialize WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', async (qr) => {
    qrCodeData = await qrcode.toDataURL(qr);
});

client.on('ready', () => {
    isReady = true;
    whatsappClient = client;
    console.log('WhatsApp client ready!');
});

client.on('message', async (msg) => {
    console.log('Message received:', msg.body);
    // Handle messages here
});

client.initialize();

// API Endpoints
app.get('/qr', (req, res) => {
    if (isReady) {
        res.json({ status: 'ready', message: 'Already connected' });
    } else if (qrCodeData) {
        res.send(`<img src="${qrCodeData}" />`);
    } else {
        res.json({ status: 'loading', message: 'Generating QR code...' });
    }
});

app.get('/status', (req, res) => {
    res.json({
        ready: isReady,
        info: isReady ? whatsappClient.info : null
    });
});

app.post('/send', async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { number, message } = req.body;

    try {
        await whatsappClient.sendMessage(`${number}@c.us`, message);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
    console.log('QR Code: http://localhost:3000/qr');
});
```

## Next Steps

1. Read the complete [USAGE-GUIDE.md](../USAGE-GUIDE.md)
2. Check [CHANGES.md](../CHANGES.md) for the fixes we implemented
3. Explore more examples in the [official documentation](https://wwebjs.dev/)

## Support

If you encounter issues:
1. Check the [Common Issues](#common-issues) section above
2. Review [CHANGES.md](../CHANGES.md) for known fixes
3. Make sure you're using Node.js >= 18.0.0

Happy coding! 🚀
