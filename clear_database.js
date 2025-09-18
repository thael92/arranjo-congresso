const { query } = require('./api/database.js');

async function clearDatabase() {
    try {
        console.log('🔍 Verificando dados existentes...');

        // Verificar congregações
        const congregations = await query('SELECT id, name, email, congregation_number FROM congregations');
        console.log('\n📋 Congregações encontradas:');
        congregations.rows.forEach(cong => {
            console.log(`- ID: ${cong.id}, Nome: ${cong.name}, Email: ${cong.email}, Número: ${cong.congregation_number}`);
        });

        // Verificar eventos
        const events = await query('SELECT COUNT(*) as count FROM events');
        console.log(`\n📅 Total de eventos: ${events.rows[0].count}`);

        // Verificar passageiros
        const passengers = await query('SELECT COUNT(*) as count FROM passengers');
        console.log(`👥 Total de passageiros: ${passengers.rows[0].count}`);

        // Verificar sessões
        const sessions = await query('SELECT COUNT(*) as count FROM sessions');
        console.log(`🔑 Total de sessões: ${sessions.rows[0].count}`);

        console.log('\n🗑️ Limpando banco de dados...');

        // Limpar na ordem correta (devido às chaves estrangeiras)
        await query('DELETE FROM sessions');
        console.log('✅ Sessões removidas');

        await query('DELETE FROM passengers');
        console.log('✅ Passageiros removidos');

        await query('DELETE FROM events');
        console.log('✅ Eventos removidos');

        await query('DELETE FROM congregations');
        console.log('✅ Congregações removidas');

        // Reset dos IDs para começar do 1
        await query('DELETE FROM sqlite_sequence WHERE name IN ("congregations", "events", "passengers", "sessions")');
        console.log('✅ IDs resetados');

        console.log('\n🎉 Banco de dados limpo com sucesso!');
        console.log('Agora você pode cadastrar uma nova congregação.');

    } catch (error) {
        console.error('❌ Erro ao limpar banco:', error);
    } finally {
        process.exit(0);
    }
}

clearDatabase();