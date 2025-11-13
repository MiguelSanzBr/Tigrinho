// services/WebSQLiteService.ts
import { User } from './SQLiteService';

// Interface para o SQL.js
interface SQLJSModule {
  Database: new (data?: Uint8Array) => SQLJSDatabase;
}

interface SQLJSDatabase {
  run(sql: string, params?: any[]): void;
  exec(sql: string): { columns: string[]; values: any[][] }[];
  prepare(sql: string): SQLJSStatement;
  close(): void;
  export(): Uint8Array;
}

interface SQLJSStatement {
  bind(values: Record<string, any> | any[]): void;
  step(): boolean;
  get(): any[];
  getAsObject(): Record<string, any>;
  free(): void;
}

export class WebSQLiteService {
  private db: SQLJSDatabase | null = null;
  private initialized = false;
  private SQL: SQLJSModule | null = null;
  private readonly STORAGE_KEY = 'sqlite_database';

  async init(): Promise<void> {
    try {
      if (typeof window === 'undefined') {
        throw new Error('Ambiente web não detectado');
      }

      // Importa initSqlJs dinamicamente
      const initSqlJs = (await import('sql.js')).default;

      // Inicializa o SQL.js
      this.SQL = await initSqlJs({
        locateFile: (file) => `https://sql.js.org/dist/${file}`
      });

      if (!this.SQL?.Database) {
        throw new Error('SQL.js não carregado corretamente');
      }

      // Tenta carregar dados salvos do localStorage
      let savedData = null;
      try {
        const savedDataString = localStorage.getItem(this.STORAGE_KEY);
        if (savedDataString) {
          const arrayBuffer = Uint8Array.from(JSON.parse(savedDataString));
          savedData = arrayBuffer;
          console.log('📂 Dados do SQLite carregados do localStorage');
        }
      } catch (error) {
        console.warn('⚠️ Não foi possível carregar dados salvos:', error);
      }

      // Cria uma instância do banco com dados salvos ou vazio
      this.db = savedData ? new this.SQL.Database(savedData) : new this.SQL.Database();

      // Cria a tabela
      this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          createdAt TEXT NOT NULL
        );
      `);

      this.initialized = true;
      console.log('SQLite Web inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar SQLite Web:', error);
      throw error;
    }
  }

  // Método para salvar no localStorage
  private saveToLocalStorage(): void {
    if (this.db && this.initialized) {
      try {
        const exportedData = this.db.export();
        const dataString = JSON.stringify(Array.from(exportedData));
        localStorage.setItem(this.STORAGE_KEY, dataString);
        console.log('💾 Dados salvos no localStorage');
      } catch (error) {
        console.warn('⚠️ Não foi possível salvar dados no localStorage:', error);
      }
    }
  }

  async saveUser(user: Omit<User, 'id' | 'createdAt'>): Promise<{ success: boolean; time: number; user?: User; error?: string }> {
    const startTime = performance.now();
    
    if (!this.initialized || !this.db) {
      const endTime = performance.now();
      return {
        success: false,
        time: endTime - startTime,
        error: 'SQLite não inicializado'
      };
    }

    try {
      const newUser: User = {
        ...user,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };

      // Verificar se email já existe
      const checkStmt = this.db.prepare('SELECT * FROM users WHERE email = :email');
      checkStmt.bind({ ':email': newUser.email });
      
      if (checkStmt.step()) {
        checkStmt.free();
        throw new Error('Email já cadastrado');
      }
      checkStmt.free();

      // Inserir usuário
      const stmt = this.db.prepare(`
        INSERT INTO users (id, name, email, password, createdAt) 
        VALUES (:id, :name, :email, :password, :createdAt)
      `);
      
      stmt.bind({
        ':id': newUser.id,
        ':name': newUser.name,
        ':email': newUser.email,
        ':password': newUser.password,
        ':createdAt': newUser.createdAt
      });
      
      stmt.step();
      stmt.free();

      // SALVAR NO LOCALSTORAGE APÓS INSERIR
      this.saveToLocalStorage();

      const endTime = performance.now();
      return { 
        success: true, 
        time: endTime - startTime,
        user: newUser
      };
    } catch (error: any) {
      const endTime = performance.now();
      return { 
        success: false, 
        time: endTime - startTime,
        error: error.message || 'Erro ao salvar usuário'
      };
    }
  }

  async getUserByEmail(email: string): Promise<{ success: boolean; time: number; user?: User; error?: string }> {
    const startTime = performance.now();
    
    if (!this.initialized || !this.db) {
      const endTime = performance.now();
      return {
        success: false,
        time: endTime - startTime,
        error: 'SQLite não inicializado'
      };
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE email = :email');
      stmt.bind({ ':email': email });
      
      let user: User | undefined;
      if (stmt.step()) {
        const result = stmt.getAsObject();
        user = {
          id: result.id as string,
          name: result.name as string,
          email: result.email as string,
          password: result.password as string,
          createdAt: result.createdAt as string
        };
      }
      
      stmt.free();

      const endTime = performance.now();
      return { 
        success: true, 
        time: endTime - startTime,
        user
      };
    } catch (error: any) {
      const endTime = performance.now();
      return { 
        success: false, 
        time: endTime - startTime,
        error: error.message
      };
    }
  }

  async getAllUsers(): Promise<{ success: boolean; time: number; users: User[]; error?: string }> {
    const startTime = performance.now();
    
    if (!this.initialized || !this.db) {
      const endTime = performance.now();
      return {
        success: false,
        time: endTime - startTime,
        users: [],
        error: 'SQLite não inicializado'
      };
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM users ORDER BY createdAt DESC');
      
      const users: User[] = [];
      while (stmt.step()) {
        const result = stmt.getAsObject();
        users.push({
          id: result.id as string,
          name: result.name as string,
          email: result.email as string,
          password: result.password as string,
          createdAt: result.createdAt as string
        });
      }
      
      stmt.free();

      const endTime = performance.now();
      return { 
        success: true, 
        time: endTime - startTime,
        users 
      };
    } catch (error: any) {
      const endTime = performance.now();
      return { 
        success: false, 
        time: endTime - startTime,
        users: [],
        error: error.message
      };
    }
  }

  async clearAll(): Promise<{ success: boolean; error?: string }> {
    if (!this.initialized || !this.db) {
      return { success: false, error: 'SQLite não inicializado' };
    }

    try {
      this.db.run('DELETE FROM users');
      // LIMPAR LOCALSTORAGE TAMBÉM
      localStorage.removeItem(this.STORAGE_KEY);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // Exportar dados (opcional - para persistência)
  exportDatabase(): Uint8Array | null {
    if (!this.db) return null;
    return this.db.export();
  }

  // Importar dados (opcional - para persistência)
  importDatabase(data: Uint8Array): void {
    if (this.db) {
      this.db.close();
    }
    if (this.SQL) {
      this.db = new this.SQL.Database(data);
      this.saveToLocalStorage();
    }
  }

  // Verificar se está inicializado
  isInitialized(): boolean {
    return this.initialized;
  }
}