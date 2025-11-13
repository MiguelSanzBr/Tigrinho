// services/SQLiteService.ts
import { Platform } from 'react-native';
import { WebSQLiteService } from './WebSQLiteService';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

const isWeb = Platform.OS === 'web';

// Implementação para Mobile
class NativeSQLiteService {
  private db: any = null;
  private initialized = false;

  async init(): Promise<void> {
    if (isWeb) return; // Não inicializar no web
    
    try {
      const SQLite = require('expo-sqlite');
      this.db = SQLite.openDatabase('users.db');
      
      return new Promise((resolve, reject) => {
        this.db.transaction(
          (tx: any) => {
            tx.executeSql(
              `CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                createdAt TEXT NOT NULL
              );`,
              [],
              () => {
                this.initialized = true;
                console.log('SQLite Mobile inicializado com sucesso');
                resolve();
              },
              (_: any, error: any) => {
                reject(error);
                return false;
              }
            );
          },
          (error: any) => reject(error)
        );
      });
    } catch (error) {
      console.error('Erro ao inicializar SQLite Mobile:', error);
      throw error;
    }
  }

// No NativeSQLiteService, substitua o método saveUser:
async saveUser(user: Omit<User, 'id' | 'createdAt'>): Promise<{ success: boolean; time: number; user?: User; error?: string }> {
  const startTime = performance.now();
  
  if (!this.initialized) {
    const endTime = performance.now();
    return {
      success: false,
      time: endTime - startTime,
      error: 'SQLite não inicializado'
    };
  }

  return new Promise((resolve) => {
    this.db.transaction(
      (tx: any) => {
        // PRIMEIRO verificar se o email já existe
        tx.executeSql(
          'SELECT * FROM users WHERE email = ?',
          [user.email],
          (_: any, { rows }: any) => {
            if (rows.length > 0) {
              const endTime = performance.now();
              resolve({ 
                success: false, 
                time: endTime - startTime,
                error: 'Email já cadastrado'
              });
              return;
            }

            // Se não existe, então inserir
            const newUser: User = {
              ...user,
              id: Date.now().toString(),
              createdAt: new Date().toISOString(),
            };

            tx.executeSql(
              `INSERT INTO users (id, name, email, password, createdAt) 
               VALUES (?, ?, ?, ?, ?)`,
              [newUser.id, newUser.name, newUser.email, newUser.password, newUser.createdAt],
              (_: any, result: any) => {
                const endTime = performance.now();
                resolve({ 
                  success: true, 
                  time: endTime - startTime,
                  user: newUser
                });
              },
              (_: any, error: any) => {
                const endTime = performance.now();
                resolve({ 
                  success: false, 
                  time: endTime - startTime,
                  error: error.message
                });
                return false;
              }
            );
          },
          (_: any, error: any) => {
            const endTime = performance.now();
            resolve({ 
              success: false, 
              time: endTime - startTime,
              error: error.message
            });
            return false;
          }
        );
      },
      (error: any) => {
        const endTime = performance.now();
        resolve({ 
          success: false, 
          time: endTime - startTime,
          error: error.message
        });
      }
    );
  });
}

  // ... (outros métodos do mobile - manter iguais)
  async getUserByEmail(email: string): Promise<{ success: boolean; time: number; user?: User; error?: string }> {
    const startTime = performance.now();
    
    if (!this.initialized) {
      const endTime = performance.now();
      return {
        success: false,
        time: endTime - startTime,
        error: 'SQLite não inicializado'
      };
    }

    return new Promise((resolve) => {
      this.db.transaction(
        (tx: any) => {
          tx.executeSql(
            'SELECT * FROM users WHERE email = ?',
            [email],
            (_: any, { rows }: any) => {
              const endTime = performance.now();
              const user = rows.length > 0 ? rows.item(0) : undefined;
              resolve({ 
                success: true, 
                time: endTime - startTime,
                user 
              });
            },
            (_: any, error: any) => {
              const endTime = performance.now();
              resolve({ 
                success: false, 
                time: endTime - startTime,
                error: error.message
              });
              return false;
            }
          );
        },
        (error: any) => {
          const endTime = performance.now();
          resolve({ 
            success: false, 
            time: endTime - startTime,
            error: error.message
          });
        }
      );
    });
  }

  async getAllUsers(): Promise<{ success: boolean; time: number; users: User[]; error?: string }> {
    const startTime = performance.now();
    
    if (!this.initialized) {
      const endTime = performance.now();
      return {
        success: false,
        time: endTime - startTime,
        users: [],
        error: 'SQLite não inicializado'
      };
    }

    return new Promise((resolve) => {
      this.db.transaction(
        (tx: any) => {
          tx.executeSql(
            'SELECT * FROM users ORDER BY createdAt DESC',
            [],
            (_: any, { rows }: any) => {
              const endTime = performance.now();
              const users: User[] = [];
              for (let i = 0; i < rows.length; i++) {
                users.push(rows.item(i));
              }
              resolve({ 
                success: true, 
                time: endTime - startTime,
                users 
              });
            },
            (_: any, error: any) => {
              const endTime = performance.now();
              resolve({ 
                success: false, 
                time: endTime - startTime,
                users: [],
                error: error.message
              });
              return false;
            }
          );
        },
        (error: any) => {
          const endTime = performance.now();
          resolve({ 
            success: false, 
            time: endTime - startTime,
            users: [],
            error: error.message
          });
        }
      );
    });
  }

  async clearAll(): Promise<{ success: boolean; error?: string }> {
    if (!this.initialized) {
      return { success: false, error: 'SQLite não inicializado' };
    }

    return new Promise((resolve) => {
      this.db.transaction(
        (tx: any) => {
          tx.executeSql(
            'DELETE FROM users',
            [],
            () => resolve({ success: true }),
            (_: any, error: any) => {
              resolve({ success: false, error: error.message });
              return false;
            }
          );
        },
        (error: any) => {
          resolve({ success: false, error: error.message });
        }
      );
    });
  }
}

// Escolher a implementação correta
let SQLiteImplementation;

if (isWeb) {
  SQLiteImplementation = new WebSQLiteService();
} else {
  SQLiteImplementation = new NativeSQLiteService();
}

export const SQLiteService = {
  async init(): Promise<void> {
    return SQLiteImplementation.init();
  },

  async saveUser(user: Omit<User, 'id' | 'createdAt'>): Promise<{ success: boolean; time: number; user?: User; error?: string }> {
    return SQLiteImplementation.saveUser(user);
  },

  async getUserByEmail(email: string): Promise<{ success: boolean; time: number; user?: User; error?: string }> {
    return SQLiteImplementation.getUserByEmail(email);
  },

  async getAllUsers(): Promise<{ success: boolean; time: number; users: User[]; error?: string }> {
    return SQLiteImplementation.getAllUsers();
  },

  async clearAll(): Promise<{ success: boolean; error?: string }> {
    return SQLiteImplementation.clearAll();
  },

  isWeb(): boolean {
    return isWeb;
  }
};