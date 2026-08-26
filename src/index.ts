import { makeWASocket, useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';

async function initBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== 401;
            console.log('Conexión cerrada. ¿Reconectar?', shouldReconnect);
            if (shouldReconnect) {
                initBot();
            }
        } else if (connection === 'open') {
            console.log('¡Bot conectado y listo para operar!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;

        const msg = m.messages[0];

        if (!msg || !msg.message || msg.key.fromMe) return;

        const textoMensaje = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const remitente = msg.key.remoteJid;

        console.log(`Mensaje de ${remitente}: ${textoMensaje}`);

        if (textoMensaje.toLowerCase() === '!ping') {
            await sock.sendMessage(remitente!, { text: '¡Pong! El bot está vivo.' }, { quoted: msg });
        }
    });
}

initBot();