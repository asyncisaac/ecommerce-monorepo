import { createApp } from './app.js';

const app = createApp();

const port = Number(process.env.PORT || 3001);
const server = app.listen(port, () => {
  console.log(`🚀 Servidor HTTP rodando na porta ${port}`);
});

server.on('error', (err: any) => {
  if (err?.code === 'EADDRINUSE') {
    const next = port + 1;
    console.warn(`⚠️ Porta ${port} em uso. Tentando porta ${next}...`);
    app.listen(next, () => console.log(`🚀 Servidor HTTP rodando na porta ${next}`));
  } else {
    console.error('Erro ao iniciar o servidor:', err);
    process.exit(1);
  }
});
