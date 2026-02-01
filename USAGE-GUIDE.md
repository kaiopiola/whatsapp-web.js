# WhatsApp Web.js - Complete Usage Guide

## Table of Contents
1. [Installation](#installation)
2. [Basic Setup](#basic-setup)
3. [Authentication](#authentication)
4. [Receiving Messages](#receiving-messages)
5. [Sending Messages](#sending-messages)
6. [Working with Media](#working-with-media)
7. [Working with Groups](#working-with-groups)
8. [Events Reference](#events-reference)
9. [Common Issues](#common-issues)
10. [Best Practices](#best-practices)

---

## Installation

### If using from npm (published package)
```bash
npm install whatsapp-web.js
```

### If using this modified version locally
```bash
# In your project directory
npm install /path/to/whatsapp-web.js
```

Or add to your `package.json`:
```json
{
  "dependencies": {
    "whatsapp-web.js": "file:../whatsapp-web.js"
  }
}
```

### Required Dependencies
```bash
npm install qrcode-terminal  # For displaying QR code in terminal (optional)
```

---

## Basic Setup

### Minimal Example

```javascript
const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
    authStrategy: new LocalAuth()
});

client.initialize();

client.on('qr', (qr) => {
    console.log('QR Code received, scan it with your phone');
    // You can display it in terminal or generate an image
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', async (msg) => {
    console.log('Message received:', msg.body);
});
```

### Recommended Setup with QR Code

```javascript
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'  // Path to store session data
    }),
    puppeteer: {
        headless: true,  // Set to false to see the browser
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

client.initialize();

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Scan the QR code above with WhatsApp');
});

client.on('authenticated', () => {
    console.log('Authentication successful!');
});

client.on('auth_failure', (msg) => {
    console.error('Authentication failed:', msg);
});

client.on('ready', async () => {
    console.log('Client is ready!');
    const info = client.info;
    console.log(`Connected as: ${info.pushname}`);
    console.log(`Phone number: ${info.wid.user}`);
});

client.on('disconnected', (reason) => {
    console.log('Client was disconnected:', reason);
});
```

---

## Authentication

### LocalAuth (Recommended)

Stores session data locally to avoid scanning QR code every time:

```javascript
const { LocalAuth } = require('whatsapp-web.js');

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    })
});
```

### NoAuth (Not Recommended for Production)

No persistent authentication, requires QR scan every time:

```javascript
const { NoAuth } = require('whatsapp-web.js');

const client = new Client({
    authStrategy: new NoAuth()
});
```

### Pairing with Phone Number

Alternative to QR code (WhatsApp Web feature):

```javascript
const client = new Client({
    authStrategy: new LocalAuth(),
    pairWithPhoneNumber: {
        phoneNumber: '5511999999999',  // Format: <COUNTRY_CODE><PHONE_NUMBER>
        showNotification: true,
        intervalMs: 180000  // 3 minutes
    }
});

client.on('code', (code) => {
    console.log('Pairing code:', code);
    // Enter this code on your phone
});
```

---

## Receiving Messages

### Event: `message` (Recommended for Bots)

Fires **only for received messages** (not your own):

```javascript
client.on('message', async (message) => {
    console.log('New message from:', message.from);
    console.log('Message body:', message.body);
    console.log('Timestamp:', message.timestamp);

    // Get chat information
    const chat = await message.getChat();
    console.log('Chat name:', chat.name);
    console.log('Is group:', chat.isGroup);

    // Get contact information
    const contact = await message.getContact();
    console.log('Contact name:', contact.pushname || contact.name);

    // Check message type
    if (message.hasMedia) {
        console.log('Message has media');
    }

    if (message.hasQuotedMsg) {
        const quotedMsg = await message.getQuotedMessage();
        console.log('Quoted message:', quotedMsg.body);
    }
});
```

### Event: `message_create`

Fires for **all messages** including your own:

```javascript
client.on('message_create', async (message) => {
    if (message.fromMe) {
        console.log('You sent:', message.body);
    } else {
        console.log('Received:', message.body);
    }
});
```

### Message Object Properties

```javascript
client.on('message', async (msg) => {
    console.log({
        id: msg.id._serialized,           // Unique message ID
        body: msg.body,                     // Message text
        from: msg.from,                     // Sender ID
        to: msg.to,                         // Recipient ID
        fromMe: msg.fromMe,                 // Is from you
        timestamp: msg.timestamp,           // Unix timestamp
        hasMedia: msg.hasMedia,             // Has media attachment
        hasQuotedMsg: msg.hasQuotedMsg,     // Is a reply
        isForwarded: msg.isForwarded,       // Is forwarded
        isStatus: msg.isStatus,             // Is a status update
        isStarred: msg.isStarred,           // Is starred
        broadcast: msg.broadcast,           // Is broadcast
        type: msg.type,                     // Message type (chat, image, video, etc.)
        mentionedIds: msg.mentionedIds      // Array of mentioned contact IDs
    });
});
```

### Filtering Messages

#### By Type
```javascript
client.on('message', async (msg) => {
    if (msg.type === 'chat') {
        console.log('Text message:', msg.body);
    } else if (msg.type === 'image') {
        console.log('Image message');
    } else if (msg.type === 'video') {
        console.log('Video message');
    } else if (msg.type === 'audio' || msg.type === 'ptt') {
        console.log('Audio message');
    } else if (msg.type === 'document') {
        console.log('Document message');
    }
});
```

#### By Chat Type
```javascript
client.on('message', async (msg) => {
    const chat = await msg.getChat();

    if (chat.isGroup) {
        console.log('Group message from:', chat.name);
        // Handle group messages
    } else {
        console.log('Private message');
        // Handle private messages
    }
});
```

#### By Sender
```javascript
client.on('message', async (msg) => {
    if (msg.fromMe) {
        return; // Ignore your own messages
    }

    // Only process messages from specific number
    if (msg.from === '5511999999999@c.us') {
        console.log('Message from specific contact');
    }
});
```

---

## Sending Messages

### Send Text Message

```javascript
// To a contact
await client.sendMessage('5511999999999@c.us', 'Hello!');

// To a group
await client.sendMessage('groupid@g.us', 'Hello group!');

// With mentions
await client.sendMessage('groupid@g.us', 'Hello @5511999999999', {
    mentions: ['5511999999999@c.us']
});
```

### Reply to Message

```javascript
client.on('message', async (msg) => {
    if (msg.body === '!ping') {
        await msg.reply('Pong!');
    }
});
```

### Send with Formatting

```javascript
// Bold, italic, strikethrough
await client.sendMessage('5511999999999@c.us',
    '*Bold text*\n' +
    '_Italic text_\n' +
    '~Strikethrough~\n' +
    '```Monospace```'
);
```

### Send Location

```javascript
const { Location } = require('whatsapp-web.js');

const location = new Location(-23.550520, -46.633308, 'São Paulo, Brazil');
await client.sendMessage('5511999999999@c.us', location);
```

### Send Contact

```javascript
await client.sendMessage('5511999999999@c.us',
    await client.getContactById('5511888888888@c.us')
);
```

---

## Working with Media

### Download Media from Message

```javascript
client.on('message', async (msg) => {
    if (msg.hasMedia) {
        const media = await msg.downloadMedia();

        if (media) {
            console.log('Media downloaded:', {
                mimetype: media.mimetype,
                filename: media.filename,
                filesize: media.filesize,
                data: media.data  // Base64 encoded
            });

            // Save to file
            const fs = require('fs');
            const buffer = Buffer.from(media.data, 'base64');
            fs.writeFileSync(`./downloads/${media.filename}`, buffer);
        }
    }
});
```

### Send Media

```javascript
const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');

// From file
const media = MessageMedia.fromFilePath('./image.jpg');
await client.sendMessage('5511999999999@c.us', media, {
    caption: 'Image caption'
});

// From URL
const mediaFromUrl = await MessageMedia.fromUrl('https://example.com/image.jpg');
await client.sendMessage('5511999999999@c.us', mediaFromUrl);

// From base64
const base64Data = fs.readFileSync('./image.jpg', { encoding: 'base64' });
const mediaFromBase64 = new MessageMedia('image/jpeg', base64Data, 'image.jpg');
await client.sendMessage('5511999999999@c.us', mediaFromBase64);
```

---

## Working with Groups

### Get All Groups

```javascript
const chats = await client.getChats();
const groups = chats.filter(chat => chat.isGroup);

groups.forEach(group => {
    console.log('Group:', group.name);
    console.log('ID:', group.id._serialized);
});
```

### Get Group Information

```javascript
const chat = await client.getChatById('groupid@g.us');

console.log('Group name:', chat.name);
console.log('Participants:', chat.participants.length);
console.log('Description:', chat.description);
console.log('Admins:', chat.participants.filter(p => p.isAdmin));
```

### Create Group

```javascript
const group = await client.createGroup('My Group', [
    '5511999999999@c.us',
    '5511888888888@c.us'
]);

console.log('Group created:', group.gid._serialized);
```

### Add/Remove Participants

```javascript
const chat = await client.getChatById('groupid@g.us');

// Add participant
await chat.addParticipants(['5511999999999@c.us']);

// Remove participant
await chat.removeParticipants(['5511999999999@c.us']);
```

### Promote/Demote Admin

```javascript
const chat = await client.getChatById('groupid@g.us');

// Promote to admin
await chat.promoteParticipants(['5511999999999@c.us']);

// Demote from admin
await chat.demoteParticipants(['5511999999999@c.us']);
```

### Change Group Settings

```javascript
const chat = await client.getChatById('groupid@g.us');

// Change subject
await chat.setSubject('New Group Name');

// Change description
await chat.setDescription('New description');

// Change group picture
const media = MessageMedia.fromFilePath('./group-image.jpg');
await chat.setPicture(media);

// Settings
await chat.setMessagesAdminsOnly(true);  // Only admins can send
await chat.setInfoAdminsOnly(true);       // Only admins can edit info
```

### Leave Group

```javascript
const chat = await client.getChatById('groupid@g.us');
await chat.leave();
```

---

## Events Reference

### Connection Events

```javascript
// QR code received
client.on('qr', (qr) => {
    console.log('QR code:', qr);
});

// Pairing code received
client.on('code', (code) => {
    console.log('Pairing code:', code);
});

// Loading screen progress
client.on('loading_screen', (percent, message) => {
    console.log('Loading:', percent, message);
});

// Successfully authenticated
client.on('authenticated', () => {
    console.log('Authenticated!');
});

// Authentication failed
client.on('auth_failure', (msg) => {
    console.error('Auth failure:', msg);
});

// Client is ready
client.on('ready', () => {
    console.log('Client ready!');
});

// Connection state changed
client.on('change_state', (state) => {
    console.log('State:', state);
});

// Client disconnected
client.on('disconnected', (reason) => {
    console.log('Disconnected:', reason);
});
```

### Message Events

```javascript
// New message received (not from you)
client.on('message', async (msg) => {});

// New message created (including yours)
client.on('message_create', async (msg) => {});

// Message acknowledgment changed
client.on('message_ack', (msg, ack) => {
    // ack: 0=ERROR, 1=PENDING, 2=SERVER, 3=DEVICE, 4=READ, 5=PLAYED
    console.log('Message ack:', ack);
});

// Message revoked for everyone
client.on('message_revoke_everyone', async (after, before) => {
    console.log('Message revoked:', before?.body);
});

// Message revoked for me only
client.on('message_revoke_me', async (msg) => {
    console.log('Message deleted for me:', msg.body);
});

// Message edited
client.on('message_edit', (msg, newBody, prevBody) => {
    console.log('Message edited from:', prevBody, 'to:', newBody);
});

// Message reaction
client.on('message_reaction', (reaction) => {
    console.log('Reaction:', reaction.reaction, 'to message:', reaction.msgId);
});

// Media uploaded
client.on('media_uploaded', (msg) => {
    console.log('Media uploaded for message:', msg.id);
});
```

### Contact Events

```javascript
// Contact changed (phone number)
client.on('contact_changed', (msg, oldId, newId, isContact) => {
    console.log('Contact changed from', oldId, 'to', newId);
});
```

### Group Events

```javascript
// User joined group
client.on('group_join', (notification) => {
    console.log('User joined:', notification.recipientIds);
});

// User left group
client.on('group_leave', (notification) => {
    console.log('User left:', notification.recipientIds);
});

// Group updated (name, description, picture)
client.on('group_update', (notification) => {
    console.log('Group updated');
});

// Group admin changed
client.on('group_admin_changed', (notification) => {
    console.log('Admin changed');
});

// Membership approval request
client.on('group_membership_request', (notification) => {
    console.log('Join request from:', notification.author);
});
```

### Chat Events

```javascript
// Chat archived/unarchived
client.on('chat_archived', (chat, archived) => {
    console.log('Chat archived:', archived);
});

// Chat removed
client.on('chat_removed', (chat) => {
    console.log('Chat removed:', chat.name);
});

// Unread count changed
client.on('unread_count', (chat) => {
    console.log('Unread count:', chat.unreadCount);
});
```

### Call Events

```javascript
// Incoming call
client.on('call', async (call) => {
    console.log('Call from:', call.peerJid);
    console.log('Is video:', call.isVideo);
    console.log('Is group:', call.isGroup);

    // Reject call
    await call.reject();
});
```

### Other Events

```javascript
// Battery status
client.on('change_battery', (batteryInfo) => {
    console.log('Battery:', batteryInfo.battery, '%');
    console.log('Plugged:', batteryInfo.plugged);
});
```

---

## Common Issues

### Issue 1: Client stuck at 99% / Ready event not firing

**Solution:** This has been fixed in this version. Make sure you're using the updated code.

```javascript
// The fix is already implemented in src/Client.js lines 287-297
// No action needed from your side
```

### Issue 2: Message events not firing

**Solution:** This has been fixed in this version. The `isNewMsg` property now correctly handles `undefined` values.

```javascript
// The fix is already implemented in src/Client.js
// Events will now fire correctly
```

### Issue 3: Session expires frequently

**Solution:** Use `LocalAuth` with persistent storage:

```javascript
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    })
});
```

### Issue 4: "Execution context was destroyed" error

**Solution:** Always check if client is ready before operations:

```javascript
let isReady = false;

client.on('ready', () => {
    isReady = true;
});

// Before sending messages
if (isReady) {
    await client.sendMessage(...);
}
```

### Issue 5: Memory leaks with media

**Solution:** Limit concurrent media downloads:

```javascript
const downloadQueue = [];
const maxConcurrent = 5;

client.on('message', async (msg) => {
    if (msg.hasMedia && downloadQueue.length < maxConcurrent) {
        downloadQueue.push(msg);
        const media = await msg.downloadMedia();
        downloadQueue.shift();
        // Process media...
    }
});
```

---

## Best Practices

### 1. Error Handling

```javascript
client.on('message', async (msg) => {
    try {
        // Your message handling logic
        await msg.reply('Response');
    } catch (error) {
        console.error('Error handling message:', error);
    }
});

// Global error handlers
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});
```

### 2. Rate Limiting

```javascript
const rateLimit = new Map();

client.on('message', async (msg) => {
    const userId = msg.from;
    const now = Date.now();

    if (rateLimit.has(userId)) {
        const lastMessage = rateLimit.get(userId);
        if (now - lastMessage < 1000) {  // 1 second cooldown
            return;
        }
    }

    rateLimit.set(userId, now);

    // Process message...
});
```

### 3. Command Handler

```javascript
const commands = {
    '!ping': async (msg) => {
        await msg.reply('Pong!');
    },

    '!help': async (msg) => {
        await msg.reply('Available commands: !ping, !help, !info');
    },

    '!info': async (msg) => {
        const chat = await msg.getChat();
        const contact = await msg.getContact();
        await msg.reply(
            `Name: ${contact.pushname}\n` +
            `Number: ${msg.from}\n` +
            `Is Group: ${chat.isGroup}`
        );
    }
};

client.on('message', async (msg) => {
    const command = msg.body.split(' ')[0].toLowerCase();

    if (commands[command]) {
        try {
            await commands[command](msg);
        } catch (error) {
            console.error('Error executing command:', error);
            await msg.reply('Error executing command');
        }
    }
});
```

### 4. Graceful Shutdown

```javascript
async function shutdown() {
    console.log('Shutting down...');
    await client.destroy();
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

### 5. Logging

```javascript
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

client.on('message', async (msg) => {
    logger.info('Message received', {
        from: msg.from,
        body: msg.body,
        timestamp: msg.timestamp
    });
});
```

---

## Complete Example: Production-Ready Bot

```javascript
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

class WhatsAppBot {
    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });

        this.isReady = false;
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.client.on('qr', (qr) => {
            qrcode.generate(qr, { small: true });
        });

        this.client.on('authenticated', () => {
            console.log('✅ Authenticated');
        });

        this.client.on('ready', () => {
            console.log('✅ Client ready');
            this.isReady = true;
        });

        this.client.on('message', async (msg) => {
            await this.handleMessage(msg);
        });

        this.client.on('disconnected', (reason) => {
            console.log('⚠️ Disconnected:', reason);
            this.isReady = false;
        });
    }

    async handleMessage(msg) {
        if (!this.isReady || msg.fromMe) return;

        try {
            const command = msg.body.toLowerCase().trim();

            switch(command) {
                case '!ping':
                    await msg.reply('🏓 Pong!');
                    break;

                case '!help':
                    await this.sendHelp(msg);
                    break;

                case '!info':
                    await this.sendInfo(msg);
                    break;

                default:
                    if (command.startsWith('!')) {
                        await msg.reply('Unknown command. Type !help for available commands.');
                    }
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    async sendHelp(msg) {
        const helpText =
            '🤖 *Available Commands*\n\n' +
            '!ping - Test bot response\n' +
            '!help - Show this message\n' +
            '!info - Show your information';

        await msg.reply(helpText);
    }

    async sendInfo(msg) {
        const chat = await msg.getChat();
        const contact = await msg.getContact();

        const infoText =
            '📱 *Your Information*\n\n' +
            `Name: ${contact.pushname || 'Unknown'}\n` +
            `Number: ${msg.from}\n` +
            `Chat Type: ${chat.isGroup ? 'Group' : 'Private'}`;

        await msg.reply(infoText);
    }

    async start() {
        await this.client.initialize();
    }

    async stop() {
        await this.client.destroy();
    }
}

// Start bot
const bot = new WhatsAppBot();
bot.start();

// Graceful shutdown
process.on('SIGINT', async () => {
    await bot.stop();
    process.exit(0);
});
```

---

## Additional Resources

- **Official Documentation**: https://wwebjs.dev/
- **GitHub Repository**: https://github.com/pedroslopez/whatsapp-web.js
- **Bug Reports**: Check CHANGES.md for known fixes

---

**Last Updated:** 2026-01-31
**Version Tested:** 2.3000.1032641640
**Node.js:** >= 18.0.0
