const express = require('express');
const cors = require('cors');
const path = require('path');
const { Client } = require('./packages/client/dist/cjs/index.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Manter instâncias ativas de clientes IMVU por sessão
const clients = new Map();

app.post('/api/login', async (req, res) => {
	const { username, password, twoFactorCode } = req.body;

	if (!username || !password) {
		return res.status(400).json({ success: false, message: 'Usuário e senha são obrigatórios.' });
	}

	try {
		const client = new Client();
		await client.login(username, password, { twoFactorCode });

		// Salvar cliente na sessão em memória usando username como chave
		clients.set(username.toLowerCase(), client);

		const account = client.account;
		const user = account.user;

		return res.json({
			success: true,
			message: 'Login efetuado com sucesso!',
			data: {
				cid: user.id,
				username: user.username,
				displayName: user.displayName,
				avatarImage: user.avatarImage,
				avatarPortraitImage: user.avatarPortraitImage,
				isVip: user.isVip,
				isAp: user.isAp,
				isCreator: user.isCreator,
				registered: user.registered,
			},
		});
	} catch (err) {
		console.error('Erro de Login:', err);
		return res.status(401).json({
			success: false,
			message: err.message || 'Falha ao autenticar no IMVU.',
		});
	}
});

app.get('/api/user/:username', async (req, res) => {
	const { username } = req.params;
	const activeUser = req.headers['x-active-user'];

	const client = activeUser ? clients.get(activeUser.toLowerCase()) : new Client();
	const targetClient = client || new Client();

	try {
		const users = await targetClient.users.fetch({ username });
		if (!users || users.length === 0) {
			return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
		}
		const user = users[0];
		return res.json({
			success: true,
			data: {
				id: user.id,
				username: user.username,
				displayName: user.displayName,
				avatarImage: user.avatarImage,
				avatarPortraitImage: user.avatarPortraitImage,
				country: user.country,
				age: user.age,
				gender: user.gender,
				isVip: user.isVip,
				isAp: user.isAp,
				isCreator: user.isCreator,
			}
		});
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message });
	}
});

app.listen(PORT, () => {
	console.log(`=================================================`);
	console.log(`🚀 SERVIDOR IMVU APP RODANDO NA PORTA http://localhost:${PORT}`);
	console.log(`=================================================`);
});
