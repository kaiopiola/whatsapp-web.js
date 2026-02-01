/**
 * Simple WhatsApp Bot Example
 *
 * This is a minimal working example to get you started.
 * Make sure you've installed the package in your project:
 * npm install /path/to/whatsapp-web.js
 */

// Use relative path when running from examples directory
const { Client, LocalAuth } = require('../index');
const qrcode = require('qrcode-terminal');

console.log('🚀 Starting WhatsApp Bot...\n');

// Create client
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
        headless: true,  // Change to false to see browser
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    }
});

// Initialize
client.initialize();

// QR Code event
client.on('qr', (qr) => {
    console.log('📱 QR Code received! Scan with WhatsApp:\n');
    qrcode.generate(qr, { small: true });
});

// Authentication successful
client.on('authenticated', () => {
    console.log('✅ Authentication successful!\n');
});

// Authentication failed
client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failed:', msg);
});

// Client is ready
client.on('ready', async () => {
    console.log('🎉 Client is ready!\n');

    const info = client.info;
    console.log(`👤 Connected as: ${info.pushname}`);
    console.log(`📞 Phone: ${info.wid.user}\n`);

    console.log('💬 Bot is now listening for messages...');
    console.log('Send "!ping" to test\n');
});

// New message received (NOT your own messages)
client.on('message', async (msg) => {
    console.log(`\n📩 MESSAGE EVENT FIRED!`);
    console.log(`   From: ${msg.from}`);
    console.log(`   Body: ${msg.body}`);
    console.log(`   Time: ${new Date(msg.timestamp * 1000).toLocaleString()}`);

    // Respond to commands
    try {
        if (msg.body === '!ping') {
            console.log('   → Responding with pong');
            await msg.reply('🏓 Pong!');
        }

        else if (msg.body === '!help') {
            console.log('   → Sending help message');
            await msg.reply(
                '🤖 *Available Commands:*\n\n' +
                '!ping - Test bot\n' +
                '!help - Show this message\n' +
                '!info - Your information\n' +
                '!time - Current time'
            );
        }

        else if (msg.body === '!info') {
            console.log('   → Sending user info');
            const chat = await msg.getChat();
            const contact = await msg.getContact();

            await msg.reply(
                '📱 *Your Information:*\n\n' +
                `Name: ${contact.pushname || contact.name || 'Unknown'}\n` +
                `Number: ${msg.from}\n` +
                `Chat Type: ${chat.isGroup ? 'Group' : 'Private'}\n` +
                `Unread Count: ${chat.unreadCount}`
            );
        }

        else if (msg.body === '!time') {
            console.log('   → Sending current time');
            await msg.reply(`🕐 Current time: ${new Date().toLocaleString()}`);
        }

        else if (msg.body.startsWith('!echo ')) {
            const text = msg.body.slice(6);
            console.log(`   → Echoing: ${text}`);
            await msg.reply(text);
        }

        else if (msg.body.startsWith('!')) {
            console.log('   → Unknown command');
            await msg.reply('❓ Unknown command. Type !help for available commands.');
        }

    } catch (error) {
        console.error('❌ Error handling message:', error);
    }
});

// All messages (including your own)
client.on('message_create', async (msg) => {
    console.log(`\n🆕 MESSAGE_CREATE EVENT FIRED!`);
    console.log(`   From: ${msg.from}`);
    console.log(`   Body: ${msg.body}`);
    console.log(`   FromMe: ${msg.fromMe}`);
});

// Client disconnected
client.on('disconnected', (reason) => {
    console.log('\n⚠️  Client disconnected:', reason);
});

// Error handling
process.on('unhandledRejection', (err) => {
    console.error('\n❌ Unhandled error:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n\n👋 Shutting down bot...');
    await client.destroy();
    process.exit(0);
});

console.log('💡 Press Ctrl+C to stop the bot\n');
