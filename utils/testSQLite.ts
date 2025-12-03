export const testSQLiteFunctions = async () => {
  console.log('=== TESTE SQLITE INICIADO ===');
  
  try {
    const SQLiteService = require('../services/SQLiteService').SQLiteService;
    
    console.log('1. Inicializando SQLite...');
    await SQLiteService.init();
    console.log('✅ SQLite inicializado');
    
    console.log('2. Testando getAllUsers...');
    const allUsers = await SQLiteService.getAllUsers();
    console.log(`Total de usuários: ${allUsers.users.length}`);
    console.log('Usuários:', allUsers.users);
    
    console.log('3. Verificando se estamos no Web...');
    console.log(`Plataforma: ${SQLiteService.isWeb() ? 'WEB' : 'MOBILE'}`);
    
    console.log('4. Testando estrutura de dados...');
    if (allUsers.users.length > 0) {
      const sampleUser = allUsers.users[0];
      console.log('Estrutura do usuário:', {
        id: typeof sampleUser.id,
        name: typeof sampleUser.name,
        email: typeof sampleUser.email,
        balance: typeof sampleUser.balance,
        hasBalance: 'balance' in sampleUser
      });
    }
    
    return { success: true, userCount: allUsers.users.length };
  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error);
    return { success: false, error: error.message };
  }
};