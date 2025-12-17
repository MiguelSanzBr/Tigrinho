import { Platform } from 'react-native';
import { WebSQLiteService } from './WebSQLiteService'; 
import * as SQLite from 'expo-sqlite';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  balance: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdraw' | 'payment' | 'transfer';
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt: string;
}

const isWeb = Platform.OS === 'web';

class NativeSQLiteService {
  private db: SQLite.SQLiteDatabase | null = null;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Inicializa o banco de dados com tratamento robusto de erros
   */
  async init(): Promise<void> {
    if (isWeb) return;
    
    // Evita múltiplas inicializações simultâneas
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        console.log('🔄 Inicializando SQLite...');
        
        // Abre o banco de dados
        this.db = await SQLite.openDatabaseAsync('finances.db');
        
        if (!this.db) {
          throw new Error('Falha ao abrir o banco de dados');
        }

        console.log('✅ Banco de dados aberto com sucesso');

        // Executa as queries de inicialização
        await this.db.execAsync(`
          PRAGMA journal_mode = WAL;
          PRAGMA foreign_keys = ON;
        `);

        // Cria tabela users
        await this.db.execAsync(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            balance REAL DEFAULT 0.0,
            createdAt TEXT NOT NULL
          );
        `);

        // Cria tabela transactions
        await this.db.execAsync(`
          CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'completed',
            createdAt TEXT NOT NULL,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
          );
        `);

        this.initialized = true;
        console.log('✅ Tabelas criadas com sucesso');
        
      } catch (error: any) {
        console.error('❌ Erro fatal na inicialização do SQLite:', error);
        this.db = null;
        this.initialized = false;
        
        // Relança o erro para ser tratado pelo chamador
        throw new Error(`Falha na inicialização do banco de dados: ${error.message}`);
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Helper seguro para obter instância do banco de dados
   */
  private async getDb(): Promise<SQLite.SQLiteDatabase> {
    // Se não está na web e não foi inicializado, tenta inicializar
    if (!isWeb && !this.initialized) {
      try {
        await this.init();
      } catch (error) {
        throw new Error('Banco de dados não inicializado. Chame SQLiteService.init() primeiro.');
      }
    }

    if (!this.db) {
      throw new Error('Instância do banco de dados não disponível');
    }

    return this.db;
  }

  /**
   * Versão modificada do createTransaction sem transactionAsync
   */
  async createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<{ 
    success: boolean; 
    time: number; 
    transaction?: Transaction; 
    error?: string 
  }> {
    const startTime = performance.now();
    
    try {
      const db = await this.getDb();
      
      const newTransaction: Transaction = {
        ...transaction,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      
      // Inicia transação manualmente
      await db.execAsync('BEGIN TRANSACTION');
      
      try {
        // 1. Verifica se o usuário existe
        const userResult = await db.getFirstAsync(
          'SELECT * FROM users WHERE id = ?', 
          [transaction.userId]
        );
        
        if (!userResult) {
          throw new Error('Usuário não encontrado');
        }

        const user = userResult as User;
        let newBalance = user.balance;

        // 2. Calcula o novo saldo
        if (transaction.type === 'deposit') {
          newBalance += transaction.amount;
        } else if (transaction.type === 'withdraw') {
          if (user.balance < transaction.amount) {
            throw new Error('Saldo insuficiente');
          }
          newBalance -= transaction.amount;
        }

        // 3. Atualiza o saldo do usuário
        await db.runAsync(
          'UPDATE users SET balance = ? WHERE id = ?',
          [newBalance, transaction.userId]
        );

        // 4. Insere a transação
        await db.runAsync(
          `INSERT INTO transactions (id, userId, type, amount, description, status, createdAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            newTransaction.id,
            newTransaction.userId,
            newTransaction.type,
            newTransaction.amount,
            newTransaction.description || '',
            newTransaction.status,
            newTransaction.createdAt
          ]
        );

        // Confirma a transação
        await db.execAsync('COMMIT');
        
        return {
          success: true,
          time: performance.now() - startTime,
          transaction: newTransaction
        };

      } catch (error: any) {
        // Reverte em caso de erro
        await db.execAsync('ROLLBACK').catch(rollbackError => {
          console.error('Erro ao fazer rollback:', rollbackError);
        });
        throw error;
      }

    } catch (error: any) {
      console.error('Erro em createTransaction:', error);
      return {
        success: false,
        time: performance.now() - startTime,
        error: `Erro de Transação: ${error.message}`
      };
    }
  }

  // Métodos auxiliares para depuração
  async checkDatabaseStatus(): Promise<{ 
    isInitialized: boolean; 
    hasDbInstance: boolean;
    isWeb: boolean 
  }> {
    return {
      isInitialized: this.initialized,
      hasDbInstance: !!this.db,
      isWeb
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const db = await this.getDb();
      const result = await db.getFirstAsync('SELECT 1 as test');
      return !!result;
    } catch (error) {
      console.error('Teste de conexão falhou:', error);
      return false;
    }
  }

  // Outros métodos permanecem iguais...
  async saveUser(user: Omit<User, 'id' | 'createdAt' | 'balance'>) {
    const startTime = performance.now();
    
    try {
      const db = await this.getDb();
      
      const existingUser = await db.getFirstAsync(
        'SELECT * FROM users WHERE email = ?', 
        [user.email]
      );
      
      if (existingUser) {
        return {
          success: false,
          time: performance.now() - startTime,
          error: 'Email já cadastrado'
        };
      }

      const newUser: User = {
        ...user,
        balance: 0.0,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };

      await db.runAsync(
        `INSERT INTO users (id, name, email, password, balance, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newUser.id, newUser.name, newUser.email, newUser.password, newUser.balance, newUser.createdAt]
      );

      return {
        success: true,
        time: performance.now() - startTime,
        user: newUser
      };

    } catch (error: any) {
      console.error('Erro em saveUser:', error);
      return {
        success: false,
        time: performance.now() - startTime,
        error: error.message
      };
    }
  }

  async getUserByEmail(email: string) {
    const startTime = performance.now();

    try {
      const db = await this.getDb();
      const user = await db.getFirstAsync(
        'SELECT * FROM users WHERE email = ?', 
        [email.trim()]
      ) as User | undefined;

      if (user) {
        return {
          success: true,
          time: performance.now() - startTime,
          user: user,
        };
      } else {
        return {
          success: false,
          time: performance.now() - startTime,
          error: 'Usuário não encontrado',
        };
      }
    } catch (error: any) {
      console.error('Erro em getUserByEmail:', error);
      return {
        success: false,
        time: performance.now() - startTime,
        error: error.message,
      };
    }
  }

  async getUserById(id: string) {
    const startTime = performance.now();
    
    try {
      const db = await this.getDb();
      const user = await db.getFirstAsync(
        'SELECT * FROM users WHERE id = ?', 
        [id]
      ) as User | undefined;

      return {
        success: true,
        time: performance.now() - startTime,
        user: user,
        error: user ? undefined : 'Usuário não encontrado'
      };

    } catch (error: any) {
      console.error('Erro em getUserById:', error);
      return {
        success: false,
        time: performance.now() - startTime,
        error: error.message
      };
    }
  }

  async getAllUsers() {
    const startTime = performance.now();
    
    try {
      const db = await this.getDb();
      const users = await db.getAllAsync(
        'SELECT * FROM users ORDER BY createdAt DESC'
      ) as User[];

      return {
        success: true,
        time: performance.now() - startTime,
        users: users
      };
    } catch (error: any) {
      console.error('Erro em getAllUsers:', error);
      return {
        success: false,
        time: performance.now() - startTime,
        users: [],
        error: error.message
      };
    }
  }

  async updateUserBalance(userId: string, newBalance: number) {
    try {
      const db = await this.getDb();

      const result = await db.runAsync(
        'UPDATE users SET balance = ? WHERE id = ?',
        [newBalance, userId]
      );
      
      if (result.changes && result.changes > 0) {
        return { success: true };
      } else {
        return { success: false, error: 'Usuário não encontrado ou saldo inalterado' };
      }

    } catch (error: any) {
      console.error('Erro em updateUserBalance:', error);
      return { success: false, error: error.message };
    }
  }

  async getTransactionsByUserId(userId: string) {
    const startTime = performance.now();
    
    try {
      const db = await this.getDb();
      const transactions = await db.getAllAsync(
        `SELECT * FROM transactions WHERE userId = ? ORDER BY createdAt DESC LIMIT 50`,
        [userId]
      ) as Transaction[];

      return {
        success: true,
        time: performance.now() - startTime,
        transactions: transactions
      };
    } catch (error: any) {
      console.error('Erro em getTransactionsByUserId:', error);
      return {
        success: false,
        time: performance.now() - startTime,
        transactions: [],
        error: error.message
      };
    }
  }

  async clearAll() {
    try {
      const db = await this.getDb();
      await db.execAsync('DELETE FROM transactions');
      await db.execAsync('DELETE FROM users');
      return { success: true };
    } catch (error: any) {
      console.error('Erro em clearAll:', error);
      return { success: false, error: error.message };
    }
  }
}

// Instanciação do serviço
let SQLiteImplementation: any;

if (isWeb) {
  SQLiteImplementation = new WebSQLiteService();
} else {
  SQLiteImplementation = new NativeSQLiteService();
}

// Exportação do serviço
export const SQLiteService = {
  // Método de inicialização aprimorado
  async init(): Promise<void> {
    try {
      await SQLiteImplementation.init();
    } catch (error) {
      console.error('❌ Falha na inicialização do SQLiteService:', error);
      throw error;
    }
  },

  // Método para verificar status do banco
  async checkStatus() {
    if (SQLiteImplementation.checkDatabaseStatus) {
      return await SQLiteImplementation.checkDatabaseStatus();
    }
    return { isInitialized: true, hasDbInstance: true, isWeb };
  },

  // Método para testar conexão
  async testConnection() {
    if (SQLiteImplementation.testConnection) {
      return await SQLiteImplementation.testConnection();
    }
    return true;
  },

  // Demais métodos...
  saveUser: SQLiteImplementation.saveUser.bind(SQLiteImplementation),
  getUserByEmail: SQLiteImplementation.getUserByEmail.bind(SQLiteImplementation),
  getUserById: SQLiteImplementation.getUserById.bind(SQLiteImplementation),
  createTransaction: SQLiteImplementation.createTransaction.bind(SQLiteImplementation),
  getTransactionsByUserId: SQLiteImplementation.getTransactionsByUserId.bind(SQLiteImplementation),
  updateUserBalance: SQLiteImplementation.updateUserBalance.bind(SQLiteImplementation),
  getAllUsers: SQLiteImplementation.getAllUsers.bind(SQLiteImplementation),
  clearAll: SQLiteImplementation.clearAll.bind(SQLiteImplementation),

  isWeb: () => isWeb
};