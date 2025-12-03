import initSqlJs, { Database as SQLJSDatabase, SqlJsStatic as SQLJSModule } from 'sql.js';
import { v4 as uuidv4 } from 'uuid'; // Recomendado para IDs mais robustos

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; 
  balance: number;
  createdAt: string;
}

export type TransactionType = 'deposit' | 'withdraw' | 'payment' | 'transfer';
export type TransactionStatus = 'completed' | 'pending' | 'failed';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  description: string;
  status: TransactionStatus;
  createdAt: string;
}

// --- 2. CLASSE WebSQLiteService ---

export class WebSQLiteService {
  private db: SQLJSDatabase | null = null;
  private initialized = false;
  private SQL: SQLJSModule | null = null;
  private readonly STORAGE_KEY = 'finances_database';

  /**
   * Inicializa o banco de dados SQL.js.
   */
  async init(): Promise<void> {
    try {
      if (this.initialized) return;

      // 1. Verificação de ambiente
      if (typeof window === 'undefined') {
        throw new Error('Ambiente web (window) não detectado.');
      }

      // 2. Importação e Inicialização do SQL.js
      this.SQL = await initSqlJs({
        // O caminho para o worker e wasm deve ser acessível
        locateFile: (file) => `https://sql.js.org/dist/${file}` 
      });

      if (!this.SQL?.Database) {
        throw new Error('SQL.js não carregado corretamente.');
      }

      // 3. Carregar dados do localStorage
      let savedData: Uint8Array | null = null;
      try {
        const savedDataString = localStorage.getItem(this.STORAGE_KEY);
        if (savedDataString) {
          // Converte a string JSON (que é um array de números) para Uint8Array
          const array = JSON.parse(savedDataString) as number[];
          savedData = Uint8Array.from(array);
          console.log('📂 Dados do SQLite carregados do localStorage.');
        }
      } catch (error) {
        console.warn('⚠️ Não foi possível carregar dados salvos:', error);
      }

      // 4. Cria ou carrega a instância do banco de dados
      this.db = savedData ? new this.SQL.Database(savedData) : new this.SQL.Database();

      // 5. Criação das tabelas
      this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          balance REAL DEFAULT 0.0,
          createdAt TEXT NOT NULL
        );
      `);

      this.db.run(`
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
      console.log('✅ SQLite Web inicializado com tabelas relacionadas.');
    } catch (error) {
      console.error('Erro ao inicializar SQLite Web:', error);
      throw error;
    }
  }

  /**
   * Exporta e salva o banco de dados no localStorage.
   */
  private saveToLocalStorage(): void {
    if (this.db && this.initialized) {
      try {
        const exportedData = this.db.export();
        // Converte Uint8Array para um array padrão de números para serialização JSON
        const dataString = JSON.stringify(Array.from(exportedData)); 
        localStorage.setItem(this.STORAGE_KEY, dataString);
      } catch (error) {
        console.warn('⚠️ Não foi possível salvar dados no localStorage:', error);
      }
    }
  }

  // --- MÉTODOS DE USUÁRIO ---

  async saveUser(user: Omit<User, 'id' | 'createdAt' | 'balance'>): Promise<{ success: boolean; time: number; user?: User; error?: string }> {
    const startTime = performance.now();
    
    if (!this.initialized || !this.db) {
      return { success: false, time: performance.now() - startTime, error: 'SQLite não inicializado' };
    }

    try {
      // 1. Verificar se email já existe
      const checkStmt = this.db.prepare('SELECT id FROM users WHERE email = :email');
      checkStmt.bind({ ':email': user.email });
      if (checkStmt.step()) {
        checkStmt.free();
        return { success: false, time: performance.now() - startTime, error: 'Email já cadastrado' };
      }
      checkStmt.free();

      // 2. Criar objeto User
      const newUser: User = {
        ...user,
        balance: 0.0,
        id: uuidv4(), 
        createdAt: new Date().toISOString(),
      };

      // 3. Inserir usuário
      const stmt = this.db.prepare(`
        INSERT INTO users (id, name, email, password, balance, createdAt) 
        VALUES (:id, :name, :email, :password, :balance, :createdAt)
      `);
      
     stmt.run({
        ':id': newUser.id,
        ':name': newUser.name,
        ':email': newUser.email,
        ':password': newUser.password,
        ':balance': newUser.balance,
        ':createdAt': newUser.createdAt
      }); // Usa run para INSERT/UPDATE/DELETE
      stmt.free();

      this.saveToLocalStorage();

      return { success: true, time: performance.now() - startTime, user: newUser };
    } catch (error: any) {
      return { success: false, time: performance.now() - startTime, error: error.message || 'Erro ao salvar usuário' };
    }
  }

  async getUserByEmail(email: string): Promise<{ success: boolean; time: number; user?: User; error?: string }> {
    const startTime = performance.now();
    
    if (!this.db) {
      return { success: false, time: performance.now() - startTime, error: 'SQLite não inicializado' };
    }

    try {
      // Usando getRowFromStatement para simplificar a conversão de objeto
      const stmt = this.db.prepare('SELECT * FROM users WHERE email = :email');
      stmt.bind({ ':email': email });
      
      let user: User | undefined;
      if (stmt.step()) {
          user = this.getRowFromStatement(stmt.getAsObject()) as User;
      }
      stmt.free();

      return { success: true, time: performance.now() - startTime, user };
    } catch (error: any) {
      return { success: false, time: performance.now() - startTime, error: error.message };
    }
  }
  
  // O getUserById foi mantido, mas será mais conciso com o helper
  async getUserById(id: string): Promise<{ success: boolean; time: number; user?: User; error?: string }> {
    const startTime = performance.now();
    
    if (!this.db) {
      return { success: false, time: performance.now() - startTime, error: 'SQLite não inicializado' };
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE id = :id');
      stmt.bind({ ':id': id });
      
      let user: User | undefined;
      if (stmt.step()) {
          user = this.getRowFromStatement(stmt.getAsObject()) as User;
      }
      stmt.free();

      return { success: true, time: performance.now() - startTime, user };
    } catch (error: any) {
      return { success: false, time: performance.now() - startTime, error: error.message };
    }
  }

  // --- MÉTODOS DE TRANSAÇÃO ---

  async createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'status'>): Promise<{ success: boolean; time: number; transaction?: Transaction; error?: string }> {
    const startTime = performance.now();
    
    if (!this.db) {
      return { success: false, time: performance.now() - startTime, error: 'SQLite não inicializado' };
    }

    try {
      // 1. Obter usuário e iniciar
      const userResult = await this.getUserById(transaction.userId);
      if (!userResult.success || !userResult.user) {
        return { success: false, time: performance.now() - startTime, error: 'Usuário não encontrado' };
      }
      const user = userResult.user;

      // 2. Calcula novo saldo
      let newBalance = user.balance;
      const amount = transaction.amount;
      
      if (transaction.type === 'deposit') {
        newBalance += amount;
      } else if (transaction.type === 'withdraw') {
        if (user.balance < amount) {
          return { success: false, time: performance.now() - startTime, error: 'Saldo insuficiente' };
        }
        newBalance -= amount;
      } else {
        // Considera 'payment' ou 'transfer' como saída de saldo
         if (user.balance < amount) {
          return { success: false, time: performance.now() - startTime, error: 'Saldo insuficiente' };
        }
        newBalance -= amount;
      }

      // 3. Cria nova transação
      const newTransaction: Transaction = {
        ...transaction,
        id: uuidv4(),
        status: 'completed', // Força 'completed' na criação
        description: transaction.description || `${transaction.type} realizado(a)`,
        createdAt: new Date().toISOString(),
      };

      // 4. Atualiza saldo do usuário
      this.db.run('UPDATE users SET balance = :balance WHERE id = :userId', {
        ':balance': newBalance,
        ':userId': transaction.userId
      });

      // 5. Insere transação
      const insertStmt = this.db.prepare(`
        INSERT INTO transactions (id, userId, type, amount, description, status, createdAt) 
        VALUES (:id, :userId, :type, :amount, :description, :status, :createdAt)
      `);
      
      insertStmt.run({
        ':id': newTransaction.id,
        ':userId': newTransaction.userId,
        ':type': newTransaction.type,
        ':amount': newTransaction.amount,
        ':description': newTransaction.description,
        ':status': newTransaction.status,
        ':createdAt': newTransaction.createdAt
      });
      insertStmt.free();

      this.saveToLocalStorage();

      return { success: true, time: performance.now() - startTime, transaction: newTransaction };
    } catch (error: any) {
      return { success: false, time: performance.now() - startTime, error: error.message || 'Erro ao criar transação' };
    }
  }

async getTransactionsByUserId(userId: string): Promise<{ success: boolean; time: number; transactions: Transaction[]; error?: string }> {
    const startTime = performance.now();
    
    if (!this.db) {
      return { success: false, time: performance.now() - startTime, transactions: [], error: 'SQLite não inicializado' };
    }

    try {
      // Preparar a consulta SQL
      const stmt = this.db.prepare('SELECT * FROM transactions WHERE userId = :userId ORDER BY createdAt DESC LIMIT 50');
      stmt.bind({ ':userId': userId });
      
      const transactions: Transaction[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        // Converter o row para Transaction usando o helper
        transactions.push(this.getRowFromStatement(row) as Transaction);
      }
      stmt.free();

      const endTime = performance.now();
      return {
        success: true,
        time: endTime - startTime,
        transactions
      };
    } catch (error: any) {
      const endTime = performance.now();
      return {
        success: false,
        time: endTime - startTime,
        transactions: [],
        error: error.message
      };
    }
  }


  private getRowFromStatement(result: Record<string, any>): Record<string, any> {
    const row: Record<string, any> = {};
    for (const key in result) {
        if (Object.prototype.hasOwnProperty.call(result, key)) {
            let value = result[key];
            
            // Corrige a tipagem de REAL (float) para number, se necessário
            if (key === 'balance' || key === 'amount') {
                value = typeof value === 'string' ? parseFloat(value) : value;
            }


            row[key] = value;
        }
    }
    return row;
  }
  
  /**
   * Helper unificado para SELECT.
   */
  private executeSelectAndMap<T>(sql: string, params: (string | number)[] = []): Promise<{ success: boolean; time: number; [key: string]: any; error?: string }> {
      const startTime = performance.now();
      if (!this.db) {
          return Promise.resolve({ success: false, time: 0, error: 'SQLite não inicializado' });
      }

      try {
          const stmt = this.db.prepare(sql);
          stmt.bind(params);
          
          const results: T[] = [];
          while (stmt.step()) {
              const row = stmt.getAsObject();
              results.push(this.getRowFromStatement(row) as T);
          }
          stmt.free();

          const endTime = performance.now();
          return Promise.resolve({ 
              success: true, 
              time: endTime - startTime, 
              [Array.isArray(results) ? 'transactions' : 'user']: Array.isArray(results) ? results : results[0],
              users: Array.isArray(results) ? results : undefined,
          });
      } catch (error: any) {
          return Promise.resolve({ success: false, time: performance.now() - startTime, error: error.message });
      }
  }

  // O resto dos métodos de utilidade (updateUserBalance, getAllUsers, clearAll)
  // podem ser mantidos como estão, mas o updateUserBalance pode ser simplificado.

  async updateUserBalance(userId: string, newBalance: number): Promise<{ success: boolean; error?: string }> {
      if (!this.db) {
        return { success: false, error: 'SQLite não inicializado' };
      }
  
      try {
        this.db.run('UPDATE users SET balance = ? WHERE id = ?', [newBalance, userId]);
        this.saveToLocalStorage();
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
  }

  async clearAll(): Promise<{ success: boolean; error?: string }> {
      if (!this.db) {
          return { success: false, error: 'SQLite não inicializado' };
      }
  
      try {
          this.db.run('DELETE FROM transactions');
          this.db.run('DELETE FROM users');
          localStorage.removeItem(this.STORAGE_KEY);
          return { success: true };
      } catch (error: any) {
          return { success: false, error: error.message };
      }
  }

  // Métodos de status e exportação...
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Opcional: Exportar uma instância singleton
export const SQLiteService = new WebSQLiteService();

// Nota: Você deve usar a instância exportada (SQLiteService) em vez de instanciar a classe diretamente.