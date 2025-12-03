// services/SQLiteService.ts (Versão Integrada e Atualizada)
import { Platform } from 'react-native';
// Certifique-se de que WebSQLiteService existe e implementa todos os métodos
// necessários, ou remova-o/adapte-o se não for relevante ou estiver em outro lugar.
import { WebSQLiteService } from './WebSQLiteService'; 

/**
 * Interface para representar um Usuário no banco de dados.
 * O campo 'balance' foi adicionado.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  balance: number; // Novo campo
  createdAt: string;
}

/**
 * Interface para representar uma Transação no banco de dados.
 */
export interface Transaction {
  id: string;
  userId: string; // Chave estrangeira para a tabela users
  type: 'deposit' | 'withdraw' | 'payment' | 'transfer';
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt: string;
}

// Verifica se a plataforma é web para escolher a implementação
const isWeb = Platform.OS === 'web';

/**
 * Implementação do serviço SQLite para Mobile (Expo-SQLite).
 * Inclui lógica para a tabela 'users' (com 'balance') e 'transactions'.
 */
class NativeSQLiteService {
  private db: any = null;
  private initialized = false;

  /**
   * Inicializa o banco de dados e cria as tabelas 'users' e 'transactions'.
   */
  async init(): Promise<void> {
    if (isWeb) return; // Não inicializar no web
    
    try {
      const SQLite = require('expo-sqlite');
      // Alterado o nome do banco para refletir o novo contexto de finanças (se desejar)
      this.db = SQLite.openDatabase('finances.db'); 
      
      return new Promise((resolve, reject) => {
        this.db.transaction(
          (tx: any) => {
            // 1. Tabela de usuários (com 'balance' e tipo REAL)
            tx.executeSql(
              `CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                balance REAL DEFAULT 0.0,
                createdAt TEXT NOT NULL
              );`,
              [],
              () => {}, // Sucesso na criação de users
              (_: any, error: any) => {
                reject(error);
                return false;
              }
            );

            // 2. Tabela de transações (relacionada com users)
            tx.executeSql(
              `CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'completed',
                createdAt TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
              );`,
              [],
              () => {
                this.initialized = true;
                console.log('✅ Banco de dados inicializado com tabelas relacionadas');
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

  // --- MÉTODOS DE USUÁRIO (AJUSTADOS PARA NOVO CAMPO 'balance') ---

  /**
   * Salva um novo usuário (verifica email duplicado).
   * Omitimos 'id', 'createdAt' e 'balance' na entrada, o 'balance' é 0.0 por padrão.
   */
  async saveUser(user: Omit<User, 'id' | 'createdAt' | 'balance'>): Promise<{ success: boolean; time: number; user?: User; error?: string }> {
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
                balance: 0.0, // Inicia o saldo em zero
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
              };

              tx.executeSql(
                `INSERT INTO users (id, name, email, password, balance, createdAt) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [newUser.id, newUser.name, newUser.email, newUser.password, newUser.balance, newUser.createdAt],
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

  /**
   * Busca um usuário pelo email.
   */
  async getUserByEmail(
    email: string
  ): Promise<{ success: boolean; time: number; user?: User; error?: string }> {
    const startTime = performance.now();

    if (!this.initialized) {
      const endTime = performance.now();
      return {
        success: false,
        time: endTime - startTime,
        error: "SQLite não inicializado",
      };
    }

    return new Promise((resolve) => {
      this.db.transaction((tx: any) => {
        tx.executeSql(
          "SELECT * FROM users WHERE email = ? LIMIT 1",
          [email.trim()],
          (_: any, { rows }: any) => {
            const endTime = performance.now();
            if (rows.length > 0) {
              // O campo 'item(0)' retorna o primeiro objeto da linha
              resolve({
                success: true,
                time: endTime - startTime,
                user: rows.item(0) as User,
              });
            } else {
              resolve({
                success: false,
                time: endTime - startTime,
                error: "Usuário não encontrado",
              });
            }
          },
          (_: any, error: any) => {
            const endTime = performance.now();
            resolve({
              success: false,
              time: endTime - startTime,
              error: error.message,
            });
            return false;
          }
        );
      });
    });
  }

  /**
   * Busca um usuário pelo ID (método novo para transações).
   */
  async getUserById(id: string): Promise<{ success: boolean; time: number; user?: User; error?: string }> {
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
            'SELECT * FROM users WHERE id = ?',
            [id],
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

  /**
   * Retorna todos os usuários.
   */
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

  /**
   * Atualiza o saldo de um usuário.
   */
  async updateUserBalance(userId: string, newBalance: number): Promise<{ success: boolean; error?: string }> {
    if (!this.initialized) {
      return { success: false, error: 'SQLite não inicializado' };
    }

    return new Promise((resolve) => {
      this.db.transaction(
        (tx: any) => {
          tx.executeSql(
            'UPDATE users SET balance = ? WHERE id = ?',
            [newBalance, userId],
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

  // --- MÉTODOS DE TRANSAÇÃO (NOVOS) ---

  /**
   * Cria uma nova transação e atualiza o saldo do usuário.
   * Executado dentro de uma única transação SQLite.
   */
  async createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<{ success: boolean; time: number; transaction?: Transaction; error?: string }> {
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
          // 1. Verifica se o usuário existe
          tx.executeSql(
            'SELECT * FROM users WHERE id = ?',
            [transaction.userId],
            (_: any, { rows }: any) => {
              if (rows.length === 0) {
                const endTime = performance.now();
                resolve({
                  success: false,
                  time: endTime - startTime,
                  error: 'Usuário não encontrado'
                });
                return;
              }

              const user = rows.item(0);
              let newBalance = user.balance;

              // 2. Calcula o novo saldo e verifica a regra de negócio (saque/withdraw)
              if (transaction.type === 'deposit') {
                newBalance += transaction.amount;
              } else if (transaction.type === 'withdraw') {
                if (user.balance < transaction.amount) {
                  const endTime = performance.now();
                  resolve({
                    success: false,
                    time: endTime - startTime,
                    error: 'Saldo insuficiente'
                  });
                  return;
                }
                newBalance -= transaction.amount;
              }
              // OBS: 'payment' e 'transfer' não alteram o saldo aqui (implementação mais complexa)

              // 3. Define a nova transação
              const newTransaction: Transaction = {
                ...transaction,
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
              };

              // 4. Atualiza o saldo do usuário
              tx.executeSql(
                'UPDATE users SET balance = ? WHERE id = ?',
                [newBalance, transaction.userId],
                (_: any) => {
                  // 5. Insere a transação
                  tx.executeSql(
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
                    ],
                    (_: any, result: any) => {
                      const endTime = performance.now();
                      resolve({
                        success: true,
                        time: endTime - startTime,
                        transaction: newTransaction
                      });
                    },
                    (_: any, error: any) => {
                      const endTime = performance.now();
                      resolve({
                        success: false,
                        time: endTime - startTime,
                        error: `Erro ao inserir transação: ${error.message}`
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
                    error: `Erro ao atualizar saldo do usuário: ${error.message}`
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
                error: `Erro ao buscar usuário: ${error.message}`
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
            error: `Erro de Transação SQLite: ${error.message}`
          });
        }
      );
    });
  }

  /**
   * Busca as transações de um usuário específico (limitado a 50).
   */
  async getTransactionsByUserId(userId: string): Promise<{ success: boolean; time: number; transactions: Transaction[]; error?: string }> {
    const startTime = performance.now();
    
    if (!this.initialized) {
      const endTime = performance.now();
      return {
        success: false,
        time: endTime - startTime,
        transactions: [],
        error: 'SQLite não inicializado'
      };
    }

    return new Promise((resolve) => {
      this.db.transaction(
        (tx: any) => {
          tx.executeSql(
            `SELECT * FROM transactions 
             WHERE userId = ? 
             ORDER BY createdAt DESC
             LIMIT 50`,
            [userId],
            (_: any, { rows }: any) => {
              const endTime = performance.now();
              const transactions: Transaction[] = [];
              for (let i = 0; i < rows.length; i++) {
                transactions.push(rows.item(i));
              }
              resolve({
                success: true,
                time: endTime - startTime,
                transactions
              });
            },
            (_: any, error: any) => {
              const endTime = performance.now();
              resolve({
                success: false,
                time: endTime - startTime,
                transactions: [],
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
            transactions: [],
            error: error.message
          });
        }
      );
    });
  }

  /**
   * Limpa todas as tabelas: 'transactions' e 'users'.
   */
  async clearAll(): Promise<{ success: boolean; error?: string }> {
    if (!this.initialized) {
      return { success: false, error: 'SQLite não inicializado' };
    }

    return new Promise((resolve) => {
      this.db.transaction(
        (tx: any) => {
          // Deleta transações primeiro (para manter a integridade referencial)
          tx.executeSql('DELETE FROM transactions', [], () => {}); 
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

// --- CONFIGURAÇÃO DO SERVIÇO EXPORTADO ---

// Adapte o WebSQLiteService para incluir os novos métodos (se aplicável ao seu projeto web)
let SQLiteImplementation: any; // O tipo real seria NativeSQLiteService | WebSQLiteService

if (isWeb) {
  // A WebSQLiteService deve ter sido atualizada no seu outro arquivo 
  // para ter os métodos: saveUser, getUserByEmail, getUserById, createTransaction, 
  // getTransactionsByUserId, updateUserBalance, getAllUsers, clearAll.
  SQLiteImplementation = new WebSQLiteService();
} else {
  SQLiteImplementation = new NativeSQLiteService();
}

/**
 * Serviço SQLite de Alto Nível (Facade/Adaptador).
 * Garante a compatibilidade entre Mobile e Web.
 */
export const SQLiteService = {
  async init(): Promise<void> {
    return SQLiteImplementation.init();
  },

  async saveUser(user: Omit<User, 'id' | 'createdAt' | 'balance'>): Promise<{ success: boolean; time: number; user?: User; error?: string }> {
    return SQLiteImplementation.saveUser(user);
  },

  async getUserByEmail(email: string): Promise<{ success: boolean; time: number; user?: User; error?: string }> {
    return SQLiteImplementation.getUserByEmail(email);
  },
  
  // Novo método
  async getUserById(id: string): Promise<{ success: boolean; time: number; user?: User; error?: string }> {
    return SQLiteImplementation.getUserById(id);
  },

  // Novo método
  async createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<{ success: boolean; time: number; transaction?: Transaction; error?: string }> {
    return SQLiteImplementation.createTransaction(transaction);
  },

  // Novo método
  async getTransactionsByUserId(userId: string): Promise<{ success: boolean; time: number; transactions: Transaction[]; error?: string }> {
    return SQLiteImplementation.getTransactionsByUserId(userId);
  },

  // Novo método
  async updateUserBalance(userId: string, newBalance: number): Promise<{ success: boolean; error?: string }> {
    return SQLiteImplementation.updateUserBalance(userId, newBalance);
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