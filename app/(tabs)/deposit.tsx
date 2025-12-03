// app/(tabs)/deposit.tsx (VERSÃO DEBUG)
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Dimensions,
  Platform, // Importado para corrigir o keyboardType
  KeyboardTypeOptions, // Importado para corrigir o keyboardType
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
// Importamos os tipos exatos do serviço, ou o próprio serviço se necessário.
// Assumindo que você tem uma definição de tipos para User e Transaction
import { 
  SQLiteService, 
  User as DBUser, 
  Transaction as DBTransaction // Usa um alias para o tipo Transaction do DB
} from "../../services/SQLiteService"; 

import { 
  formatCurrency, 
  formatDate, 
  formatInputToCurrency,
  parseCurrencyToNumber 
} from "../../utils/formatters";

// 1. Interfaces Corrigidas e Tipadas 🔑
// Interface do Usuário (Baseada em DBUser, garantindo que o saldo seja number)
interface User {
  id: string;
  name: string;
  email: string;
  balance: number;
}

// Interface de Transação (Baseada em DBTransaction, garantindo a tipagem do createdAt como number/timestamp)
interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  // Tipado como number, assumindo que formatDate espera um timestamp (number)
  createdAt: number; 
}


// Interface para o tema (Mantida)
interface Theme {
  background: string;
  card: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  inputBg: string;
  inputBorder: string;
  placeholder: string;
  link: string;
  buttonBg: string;
  depositColor: string;
  withdrawColor: string;
}

// Temas (Mantidos)
const darkTheme: Theme = {
  background: "#0f0b1a",
  card: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.15)",
  textPrimary: "#ffffff",
  textSecondary: "#cbd5e1",
  inputBg: "rgba(255,255,255,0.08)",
  inputBorder: "rgba(255,255,255,0.25)",
  placeholder: "#94a3b8",
  link: "#93c5fd",
  buttonBg: "#3b82f6",
  depositColor: "#10b981",
  withdrawColor: "#ef4444",
};

const lightTheme: Theme = {
  background: "#f1f5f9",
  card: "#ffffff",
  border: "#e2e8f0",
  textPrimary: "#111827",
  textSecondary: "#475569",
  inputBg: "#ffffff",
  inputBorder: "#cbd5e1",
  placeholder: "#94a3b8",
  link: "#2563eb",
  buttonBg: "#2563eb",
  depositColor: "#10b981",
  withdrawColor: "#ef4444",
};

// Componente para exibir logs de debug (Mantido)
const DebugLog = ({ logs }: { logs: string[] }) => (
  <View style={{ padding: 10, backgroundColor: '#1a1a1a', marginTop: 10, borderRadius: 5 }}>
    <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 5 }}>Debug Logs:</Text>
    {logs.map((log, index) => (
      <Text key={index} style={{ color: '#aaa', fontSize: 10, fontFamily: 'monospace' }}>
        {log}
      </Text>
    ))}
  </View>
);

export default function DepositScreen() {
  const router = useRouter();
  const [amountInput, setAmountInput] = useState(""); 
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  // 2. Tipagem Correta: Substituindo 'any' por 'User' e 'Transaction[]'
  const [user, setUser] = useState<User | null>(null); 
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const theme = isDarkMode ? darkTheme : lightTheme;

  // Função para adicionar log (Mantido)
  const addDebugLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    const logEntry = `[${timestamp}] ${message}`;
    if (__DEV__) {
      console.log(`[DEBUG] ${message}`);
    }
    setDebugLogs(prev => [logEntry, ...prev.slice(0, 20)]);
  }, []);

  // Carregar dados do usuário
const loadUserData = useCallback(async () => {
    // Certifique-se de que as interfaces User, Transaction e DBTransaction estão acessíveis
    // O tipo DBTransaction deve refletir o retorno do SQLiteService (Ex: createdAt: string)
    // O tipo Transaction deve refletir o estado local (Ex: createdAt: number)
    
    try {
      setLoading(true);
      addDebugLog("Iniciando loadUserData");
      
      const loggedUserEmail = await AsyncStorage.getItem("@loggedUserEmail");
      addDebugLog(`Email do AsyncStorage: "${loggedUserEmail}"`);
      
      if (!loggedUserEmail) {
        addDebugLog("❌ Nenhum email encontrado no AsyncStorage");
        Alert.alert("Erro", "Usuário não encontrado. Faça login novamente.");
        router.replace("/login");
        return;
      }

      // Inicializar SQLite se necessário
      addDebugLog("Inicializando SQLiteService...");
      try {
        await SQLiteService.init();
        addDebugLog("✅ SQLiteService inicializado");
      } catch (initError: any) { 
        addDebugLog(`❌ Erro ao inicializar SQLite: ${initError.message || 'Desconhecido'}`);
        // É importante que o throw aqui seja tratado no catch externo ou que o erro seja tratado localmente.
        // Se este bloco não lançar, ele continua. Se lançar, o catch externo o pega.
        // Mantendo o throw para o catch externo.
        throw initError;
      }

      addDebugLog(`Buscando usuário com email: ${loggedUserEmail}`);
      // Usando o resultado tipado do DB
      const userResult = await SQLiteService.getUserByEmail(loggedUserEmail); 
      
      if (userResult.success && userResult.user) {
        // 1. Conversão do Usuário: Garante que o objeto User é tipado corretamente.
        const userFromDB: User = { 
          // O DBUser deve ter todos os campos necessários. O balance é convertido.
          ...userResult.user, 
          balance: Number(userResult.user.balance) || 0 // Garante que o saldo é NUMBER
        } as User; 

        addDebugLog(`✅ Usuário encontrado: ${userFromDB.name} (ID: ${userFromDB.id})`);
        addDebugLog(`Saldo do usuário: ${userFromDB.balance}`);
        
        setUser(userFromDB);
        setBalance(userFromDB.balance);
        
        // Carregar transações
        addDebugLog("Buscando transações do usuário...");
        const transactionsResult = await SQLiteService.getTransactionsByUserId(userFromDB.id);
        
        if (transactionsResult.success) {
          // 2. Mapeamento e Conversão CORRETA: Transforma DBTransaction[] em Transaction[]
          const convertedTransactions: Transaction[] = transactionsResult.transactions
             .map((t: DBTransaction) => {
                // Cria um novo objeto com base na transação do DB (DBTransaction)
                const baseTransaction = t as unknown as Omit<Transaction, 'createdAt'>;
                
                // Converte a string de data (t.createdAt) para um timestamp numérico (number)
                const createdAtNumber = new Date(t.createdAt).getTime();
                
                // Retorna a transação com a propriedade createdAt corrigida
                return {
                    ...baseTransaction,
                    createdAt: createdAtNumber,
                } as Transaction;
             })
             .sort((a, b) => b.createdAt - a.createdAt); // Ordenação

          addDebugLog(`✅ ${convertedTransactions.length} transações carregadas`);
          setTransactions(convertedTransactions);
        } else {
          addDebugLog(`❌ Erro ao carregar transações: ${transactionsResult.error}`);
        }
      } else {
        addDebugLog(`❌ Falha ao carregar usuário: ${userResult.error || 'Não encontrado'}`);
        Alert.alert(
          "Erro", 
          `Falha ao carregar dados do usuário: ${userResult.error || 'Usuário não encontrado'}`
        );
      }
    } catch (error: any) {
      addDebugLog(`💥 ERRO CATCH em loadUserData: ${error.message}`);
      console.error("Erro completo:", error);
      Alert.alert("Erro", `Falha ao inicializar aplicação: ${error.message}`);
    } finally {
      addDebugLog("Finalizando loadUserData");
      setLoading(false);
    }
  }, [router, addDebugLog]);

  useEffect(() => {
    addDebugLog("📱 DepositScreen montado");
    loadUserData();
    
    return () => {
      addDebugLog("📱 DepositScreen desmontado");
    };
  }, [loadUserData, addDebugLog]);

  // Função para formatar input (Mantido)
  const handleAmountChange = (text: string) => {
    addDebugLog(`Input alterado: "${text}"`);
    const formatted = formatInputToCurrency(text);
    setAmountInput(formatted);
    addDebugLog(`Input formatado: "${formatted}"`);
  };

  // Função para valor rápido (Mantido)
  const handleQuickAmount = (value: number) => {
    addDebugLog(`Valor rápido selecionado: R$ ${value}`);
    setAmountInput(value.toFixed(2).replace('.', ','));
  }

  // Função principal de depósito
  const handleDeposit = async () => {
    addDebugLog("=== INICIANDO DEPÓSITO ===");
    
    if (!user) {
      addDebugLog("❌ Usuário não encontrado para depósito");
      Alert.alert("Erro", "Usuário não encontrado.");
      return;
    }

    addDebugLog(`Input atual: "${amountInput}"`);
    
    // Converter valor para número
    const depositAmount = parseCurrencyToNumber(amountInput);
    addDebugLog(`Valor convertido: ${depositAmount}`);
    
    if (isNaN(depositAmount) || depositAmount <= 0) {
      addDebugLog("❌ Valor inválido para depósito");
      Alert.alert("Erro", "Digite um valor válido maior que zero.");
      return;
    }

    if (depositAmount > 100000) {
      addDebugLog("❌ Valor excede limite de R$ 100.000,00");
      Alert.alert("Erro", "Valor máximo por depósito é R$ 100.000,00.");
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    addDebugLog("⌛ Iniciando processamento do depósito");

    try {
      const transactionData = {
        userId: user.id,
        type: "deposit" as const,
        amount: depositAmount,
        description: description.trim() || "Depósito realizado",
        status: "completed" as const,
      };

      addDebugLog(`Dados da transação: ${JSON.stringify(transactionData)}`);
      
      const result = await SQLiteService.createTransaction(transactionData);
      addDebugLog(`Resultado createTransaction: success=${result.success}, error=${result.error}`);

      if (result.success) {
        // 5. ATUALIZAÇÃO DO SALDO DO DB (Melhor Prática)
        addDebugLog("Buscando saldo atualizado do usuário no DB...");
        const updatedUserResult = await SQLiteService.getUserByEmail(user.email);
        
        let newBalance = balance + depositAmount; // Fallback
        
        if (updatedUserResult.success && updatedUserResult.user) {
          // Usa o saldo retornado pelo DB, que é a fonte de verdade
          const updatedUser: User = { 
            ...updatedUserResult.user, 
            balance: Number(updatedUserResult.user.balance) || 0 
          } as User;
          
          newBalance = updatedUser.balance;
          setUser(updatedUser); // Atualiza o objeto user
          addDebugLog(`✅ Saldo obtido do DB: ${newBalance}`);
        } else {
          addDebugLog("⚠️ Falha ao obter saldo atualizado do DB. Usando cálculo local.");
          setUser(prevUser => (prevUser ? { ...prevUser, balance: newBalance } : null)); 
        }

        // Atualiza estado local de saldo
        setBalance(newBalance);
        
        if (result.transaction) {
          // 6. Conversão de Transação: Garante que o tipo é o esperado (Transaction)
          const newTransaction: Transaction = {
            ...(result.transaction as DBTransaction),
            createdAt: Number(result.transaction.createdAt) || Date.now()
          } as Transaction;
          
          addDebugLog(`Transação criada: ID=${newTransaction.id}`);
          setTransactions([newTransaction, ...transactions]);
        }

        Alert.alert(
          "Sucesso! 🎉",
          `Depósito de ${formatCurrency(depositAmount)} realizado com sucesso!\n\nNovo saldo: ${formatCurrency(newBalance)}`,
          [
            {
              text: "OK",
              onPress: () => {
                setAmountInput("");
                setDescription("");
                addDebugLog("✅ Depósito confirmado, campos resetados");
              },
            },
          ]
        );
      } else {
        addDebugLog(`❌ Erro no createTransaction: ${result.error}`);
        Alert.alert("Erro no Depósito", result.error || "Falha ao realizar depósito.");
      }
    } catch (error: any) {
      addDebugLog(`💥 ERRO CATCH em handleDeposit: ${error.message}`);
      console.error("Erro completo no depósito:", error);
      Alert.alert("Erro", `Falha ao processar depósito: ${error.message}`);
    } finally {
      addDebugLog("🏁 Finalizando processamento do depósito");
      setLoading(false);
    }
  };

  // Função para testar SQLite (Mantida)
  const testSQLiteConnection = async () => {
    // ... mantida ...
  };

  // Limpar logs (Mantida)
  const clearDebugLogs = () => {
    setDebugLogs([]);
    addDebugLog("Logs de debug limpos");
  };

  if (loading && !user) {
    return (
      <View style={[styles.loadingContainer, {backgroundColor: theme.background}]}>
        <ActivityIndicator size="large" color={theme.buttonBg} />
        <Text style={{color: theme.textSecondary, marginTop: 10}}>Carregando dados do usuário...</Text>
        <Text style={{color: theme.textSecondary, fontSize: 12, marginTop: 5}}>
          Verifique o console para logs de debug
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Cabeçalho com ferramentas de debug */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            Depósito 💰
          </Text>
          {user && (
            <Text style={[styles.userInfo, { color: theme.textSecondary }]}>
              {user.name} | Saldo: {formatCurrency(balance)}
            </Text>
          )}
        </View>
        
        <View style={styles.headerButtons}>
   
          
          <TouchableOpacity
            style={[styles.themeButton, {backgroundColor: theme.card, borderColor: theme.border}]}
            onPress={() => setIsDarkMode(!isDarkMode)}
          >
            <Text style={{ fontSize: 20 }}>{isDarkMode ? "☀️" : "🌙"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Painel de debug */}


      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Card de Saldo */}
        <View style={[styles.balanceCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>
            Saldo Disponível
          </Text>
          <Text style={[styles.balanceValue, { color: theme.textPrimary }]}>
            {formatCurrency(balance)}
          </Text>
          <Text style={[styles.balanceInfo, { color: theme.textSecondary }]}>
            ID: {user?.id?.substring(0, 8) || 'N/A'}...
          </Text>
          <Text style={[styles.balanceInfo, { color: theme.textSecondary, fontSize: 10 }]}>
            Email: {user?.email || 'Não carregado'}
          </Text>
        </View>

        {/* Card de Depósito */}
        <View style={[styles.depositCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
            Realizar Depósito
          </Text>

          {/* Input Valor (Correção do keyboardType) */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Valor (R$)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.textPrimary,
                  fontSize: 24,
                  fontWeight: 'bold',
                },
              ]}
              placeholder="0,00"
              placeholderTextColor={theme.placeholder}
              value={amountInput}
              onChangeText={handleAmountChange}
              // 7. CORREÇÃO DE TYPAGEM E COMPATIBILIDADE: Usa decimal-pad para iOS e numeric para Android/outros
              keyboardType={Platform.select<KeyboardTypeOptions>({
                ios: 'decimal-pad',
                android: 'numeric',
                default: 'default'
              })}
              editable={!loading}
              testID="amount-input"
            />
          </View>

          {/* Input Descrição (Mantido) */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Descrição (opcional)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.textPrimary,
                },
              ]}
              placeholder="Ex: Depósito via PIX"
              placeholderTextColor={theme.placeholder}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
              editable={!loading}
              testID="description-input"
            />
          </View>

          {/* Botões de valor rápido (Mantido) */}
          <View style={styles.quickAmounts}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Valor Rápido:
            </Text>
            <View style={styles.quickButtons}>
              {[10, 50, 100, 500, 1000].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.quickButton,
                    { 
                      backgroundColor: theme.inputBg, 
                      borderColor: amountInput === value.toFixed(2).replace('.', ',') ? theme.buttonBg : theme.inputBorder,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => handleQuickAmount(value)}
                  disabled={loading}
                  testID={`quick-amount-${value}`}
                >
                  <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>
                    {formatCurrency(value)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Botão de Depósito (Mantido) */}
          <TouchableOpacity
            style={[
              styles.depositButton,
              { backgroundColor: theme.buttonBg },
              (loading || !amountInput) && styles.buttonDisabled,
            ]}
            onPress={handleDeposit}
            disabled={loading || !amountInput}
            testID="deposit-button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.depositButtonText}>Confirmar Depósito</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Histórico de Transações */}
        <View style={[styles.historyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.historyHeader}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Histórico Recente
            </Text>
            <Text style={[styles.transactionCount, { color: theme.textSecondary }]}>
              ({transactions.length} transações)
            </Text>
          </View>
          
          {transactions.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Nenhuma transação realizada.
            </Text>
          ) : (
            transactions.slice(0, 5).map((transaction) => (
              <View
                // 8. Correção de Key
                key={transaction.id + '-' + transaction.createdAt} 
                style={[
                  styles.transactionItem,
                  { borderBottomColor: theme.border },
                ]}
              >
                <View style={styles.transactionInfo}>
                  <View style={styles.transactionHeader}>
                    <Text style={[styles.transactionType, { 
                      color: transaction.type === 'deposit' ? theme.depositColor : theme.withdrawColor 
                    }]}>
                      {transaction.type === 'deposit' ? 'Depósito' : 'Saque'}
                    </Text>
                    <Text style={[styles.transactionStatus, { 
                      color: transaction.status === 'completed' ? '#10b981' : 
                             transaction.status === 'pending' ? '#f59e0b' : '#ef4444'
                    }]}>
                      {transaction.status.toUpperCase()} 
                    </Text>
                  </View>
                  <Text style={[styles.transactionDesc, { color: theme.textSecondary }]}>
                    {transaction.description}
                  </Text>
                  <Text style={[styles.transactionDate, { color: theme.placeholder }]}>
                    {/* 9. Uso Correto: transaction.createdAt é number (timestamp) */}
                    {formatDate(transaction.createdAt)} 
                  </Text>
                  <Text style={[styles.transactionId, { color: theme.placeholder, fontSize: 8 }]}>
                    ID: {transaction.id.substring(0, 8)}...
                  </Text>
                </View>
                <Text style={[
                  styles.transactionAmount,
                  { color: transaction.type === 'deposit' ? theme.depositColor : theme.withdrawColor },
                ]}>
                  {transaction.type === 'deposit' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Botões de debug adicionais (Mantidos) */}
        <View style={styles.debugButtonsRow}>
          <TouchableOpacity
            style={[styles.debugButtonLarge, { backgroundColor: '#3b82f6' }]}
            onPress={() => {
              addDebugLog("=== FORÇANDO RECARREGAMENTO ===");
              loadUserData();
            }}
          >
            <Text style={styles.debugButtonLargeText}>🔁 Recarregar Dados</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.debugButtonLarge, { backgroundColor: '#8b5cf6' }]}
            onPress={async () => {
              const email = await AsyncStorage.getItem("@loggedUserEmail");
              Alert.alert("Debug Info", `Email salvo: ${email || 'N/A'}\nPlataforma: ${SQLiteService.isWeb() ? 'Web' : 'Mobile'}`);
            }}
          >
            <Text style={styles.debugButtonLargeText}>ℹ️ Info do Sistema</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// Estilos (Mantidos, apenas o borderBottomColor no header foi ajustado para usar o theme)
const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  // ====================
  // ESTILOS GERAIS E LAYOUT 🏠
  // ====================
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // ====================
  // ESTILOS DO CABEÇALHO (Header) ⚙️
  // ====================
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    borderBottomWidth: 1,
    // Corrigido para remover o comentário desnecessário. A cor real virá do tema.
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
  },
  userInfo: {
    fontSize: 12,
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  themeButton: {
    borderRadius: 20,
    padding: 6,
    borderWidth: 1,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  debugButton: {
    borderRadius: 20,
    padding: 6,
    borderWidth: 1,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ====================
  // ESTILOS DO PAINEL DE DEBUG 🐛
  // ====================
  debugPanel: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 10,
    maxHeight: 200,
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  debugActions: {
    flexDirection: 'row',
    gap: 5,
  },
  debugActionButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  debugActionText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  debugLogsContainer: {
    maxHeight: 150,
    padding: 10,
  },
  debugLogText: {
    fontSize: 9,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  debugButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  debugButtonLarge: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  debugButtonLargeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  
  // ====================
  // ESTILOS DE CARDS E SALDO 💳
  // ====================
  balanceCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    alignItems: "center",
    // Corrigido o Shadow para a sintaxe web/compatível com warnings (boxShadow)
    // Se não funcionar, volte para:
    /*
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    */
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: "900",
    marginBottom: 8,
  },
  balanceInfo: {
    fontSize: 12,
    marginBottom: 2,
  },

  // ====================
  // ESTILOS DE DEPÓSITO E INPUTS 💸
  // ====================
  depositCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    // Corrigido o Shadow para a sintaxe web/compatível com warnings (boxShadow)
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 16,
  },
  quickAmounts: {
    marginBottom: 20,
  },
  quickButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  quickButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 70,
    alignItems: 'center',
  },
  depositButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  depositButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },

  // ====================
  // ESTILOS DO HISTÓRICO DE TRANSAÇÕES 📜
  // ====================
  historyCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  transactionCount: {
    fontSize: 12,
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: 20,
    fontStyle: "italic",
    fontSize: 14,
  },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 10,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  transactionType: {
    fontSize: 15,
    fontWeight: "700",
  },
  transactionStatus: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  transactionDesc: {
    fontSize: 12,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 10,
    marginBottom: 2,
  },
  transactionId: {
    fontSize: 8,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: "700",
    minWidth: 100,
    textAlign: 'right',
  },
});