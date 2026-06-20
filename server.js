const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4055;

app.use(cors());
app.use(express.json());

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
            token: 'fake-jwt-token-12345'
        });
    } else {
        return res.status(401).json({
            status: 'error',
            message: 'Credenciales inválidas'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor de prueba corriendo en http://localhost:${PORT}`);
});
