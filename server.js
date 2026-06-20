const express = require('express');
const cors = require('cors');
const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const fs = require('fs');

let firebaseInitialized = false;
try {
    // Si no existe, esto lanzará un error que será atrapado por el catch
    const serviceAccount = require('./serviceAccountKey.json');
    initializeApp({
        credential: cert(serviceAccount)
    });
    firebaseInitialized = true;
    console.log("Firebase Admin inicializado correctamente.");
} catch (error) {
    console.error("Detalle de error:", error);
    console.warn("ADVERTENCIA: No se pudo inicializar Firebase. Asegúrate de colocar el archivo 'serviceAccountKey.json' en la raíz del proyecto.");
}

const app = express();
const PORT = process.env.PORT || 4055;

app.use(cors());
app.use(express.json()); //

const path = require('path');
// Servir la carpeta estática para la página web
app.use(express.static(path.join(__dirname, 'public')));

// Base de datos de prueba en memoria para tokens
// En producción, esto iría a MySQL, MongoDB, etc.
const userTokens = {};

// Default route to check if backend is running
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Servicio funcionando o activo al 100%'
    });
});

// Login route
app.post('/login', (req, res) => {
    const { user, pass } = req.body;

    if (user === 'admin' && pass === 'admin') {
        return res.status(200).json({
            status: 'success',
            message: 'Login exitoso',
            success: true,
            data: {
                idUsuario: '123',
                userName: user
            },
            error: null
        });
    } else {
        return res.status(401).json({
            status: 'error',
            message: 'Credenciales inválidas',
            success: false,
            data: null,
            error: 'Unauthorized'
        });
    }
});

// Enviar mensaje push a tema "global"
app.post('/send-message', async (req, res) => {
    if (!firebaseInitialized) {
        return res.status(500).json({ success: false, error: 'Firebase no configurado. Falta serviceAccountKey.json.' });
    }

    const { title, body } = req.body;

    if (!title || !body) {
        return res.status(400).json({ success: false, error: 'Falta título o cuerpo del mensaje.' });
    }

    const message = {
        notification: {
            title: title,
            body: body
        },
        topic: 'global' // Envía a todos los dispositivos suscritos a este tema
    };

    try {
        const response = await getMessaging().send(message);
        console.log('Mensaje enviado:', response);
        return res.status(200).json({ success: true, message: 'Mensaje enviado a Firebase', messageId: response });
    } catch (error) {
        console.error('Error al enviar a Firebase:', error);
        return res.status(500).json({ success: false, error: 'Error interno de Firebase.' });
    }
});

// RECIBIR TOKEN FCM DEL DISPOSITIVO (Targeted Notifications)
// Android llamará aquí justo después del login
app.post('/update-fcm-token', (req, res) => {
    const { userId, token } = req.query; // Recibimos por QueryParams según el Retrofit actual

    if (!userId || !token) {
        return res.status(400).json({ status: 'error', message: 'Falta userId o token' });
    }

    // Guardamos el token asociado al usuario
    userTokens[userId] = token;
    console.log(`📱 Token actualizado para usuario ${userId}: ${token.substring(0, 10)}...`);

    res.status(200).json({ status: 'success', message: 'Token guardado en servidor' });
});

// ENVIAR MENSAJE A UN USUARIO ESPECÍFICO
app.post('/send-to-user', async (req, res) => {
    if (!firebaseInitialized) return res.status(500).json({ error: 'Firebase no configurado.' });

    const { userId, title, body } = req.body;
    const token = userTokens[userId];

    if (!token) {
        return res.status(404).json({ error: "No hay token para este usuario. ¿Se logueó en la App?" });
    }

    const message = {
        notification: { title, body },
        token: token // Enviamos al token específico guardado
    };

    try {
        const response = await getMessaging().send(message);
        console.log('👤 Mensaje individual enviado:', response);
        res.status(200).json({ success: true, messageId: response });
    } catch (error) {
        console.error('Error enviando individual:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de prueba corriendo en http://0.0.0.0:${PORT}`);
});
