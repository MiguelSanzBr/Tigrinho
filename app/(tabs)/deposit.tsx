// app/(tabs)/deposit.tsx (FRONT-END MELHORADO)
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
  Platform,
  KeyboardTypeOptions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { SQLiteService } from "../../services/SQLiteService";
import { 
  formatCurrency, 
  formatDate, 
  formatInputToCurrency,
  parseCurrencyToNumber 
} from "../../utils/formatters";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

// Interfaces
interface User {
  id: string;
  name: string;
  email: string;
  balance: number;
}

interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt: number;
}

interface Theme {
  background: string;
  card: string;
  primary: string;
  success: string;
  error: string;
  warning: string;
  textPrimary: string;
  textSecondary: string;
  inputBg: string;
  inputBorder: string;
  placeholder: string;
  buttonBg: string;
  border: string;
}

// Temas Aprimorados
const darkTheme: Theme = {
  background: "#0F172A",
  card: "#1E293B",
  primary: "#3B82F6",
  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
  textPrimary: "#F1F5F9",
  textSecondary: "#94A3B8",
  inputBg: "#334155",
  inputBorder: "#475569",
  placeholder: "#64748B",
  buttonBg: "#3B82F6",
  border: "#334155",
};

const lightTheme: Theme = {
  background: "#F8FAFC",
  card: "#FFFFFF",
  primary: "#2563EB",
  success: "#059669",
  error: "#DC2626",
  warning: "#D97706",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  inputBg: "#FFFFFF",
  inputBorder: "#E2E8F0",
  placeholder: "#94A3B8",
  buttonBg: "#2563EB",
  border: "#E2E8F0",
};

export default function DepositScreen() {
  const router = useRouter();
  const [amountInput, setAmountInput] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<string | null>("pix");

  const theme = isDarkMode ? darkTheme : lightTheme;

  
  // Carregar dados do usuário
const loadUserData = useCallback(async (forceRefresh = false) => {
  if (forceRefresh) {
    setLoading(true);
  }
  
  try {
    const loggedUserEmail = await AsyncStorage.getItem("@loggedUserEmail");
    
    if (!loggedUserEmail) {
      router.replace("/login");
      return;
    }

    // Força uma nova inicialização se for um refresh
    if (forceRefresh) {
      await SQLiteService.init();
    }
    
    const userResult = await SQLiteService.getUserByEmail(loggedUserEmail);
    
    if (userResult.success && userResult.user) {
      const userFromDB: User = { 
        ...userResult.user, 
        balance: Number(userResult.user.balance) || 0
      };
      
      setUser(userFromDB);
      setBalance(userFromDB.balance); // Atualiza o estado do balance
      
      const transactionsResult = await SQLiteService.getTransactionsByUserId(userFromDB.id);
      
      if (transactionsResult.success) {
        const convertedTransactions: Transaction[] = transactionsResult.transactions
          .map((t: any) => ({
            ...t,
            amount: Number(t.amount),
            createdAt: new Date(t.createdAt).getTime(),
          }))
          .sort((a, b) => b.createdAt - a.createdAt);

        setTransactions(convertedTransactions);
      }
    }
  } catch (error: any) {
    console.error("Erro ao carregar dados:", error);
    if (forceRefresh) {
      Alert.alert("Erro", "Falha ao atualizar dados.");
    }
  } finally {
    if (forceRefresh) {
      setLoading(false);
    }
  }
}, [router]);
useFocusEffect(
  React.useCallback(() => {
    loadUserData(); // Atualiza dados quando a tela ganha foco
    
    // Atualiza a cada 30 segundos enquanto a tela está em foco
    const interval = setInterval(() => {
      loadUserData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [loadUserData])
);
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Função para formatar input
  const handleAmountChange = (text: string) => {
    const formatted = formatInputToCurrency(text);
    setAmountInput(formatted);
  };

  // Função para valor rápido
  const handleQuickAmount = (value: number) => {
    setAmountInput(value.toFixed(2).replace('.', ','));
  };

  // Função principal de depósito
  const handleDeposit = async () => {
    if (!user) {
      Alert.alert("Erro", "Usuário não encontrado.");
      return;
    }

    const depositAmount = parseCurrencyToNumber(amountInput);
    
    if (isNaN(depositAmount) || depositAmount <= 0) {
      Alert.alert("Erro", "Digite um valor válido maior que zero.");
      return;
    }

    if (depositAmount > 100000) {
      Alert.alert("Erro", "Valor máximo por depósito é R$ 100.000,00.");
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      const transactionData = {
        userId: user.id,
        type: "deposit" as const,
        amount: depositAmount,
        description: description.trim() || `Depósito via ${selectedMethod?.toUpperCase() || "PIX"}`,
        status: "completed" as const,
      };

      const result = await SQLiteService.createTransaction(transactionData);

      if (result.success) {
        const updatedUserResult = await SQLiteService.getUserByEmail(user.email);
        let newBalance = balance + depositAmount;
        
        if (updatedUserResult.success && updatedUserResult.user) {
          const updatedUser: User = { 
            ...updatedUserResult.user, 
            balance: Number(updatedUserResult.user.balance) || 0 
          };
          newBalance = updatedUser.balance;
          setUser(updatedUser);
        } else {
          setUser(prevUser => (prevUser ? { ...prevUser, balance: newBalance } : null));
        }

        setBalance(newBalance);
        
        if (result.transaction) {
          const newTransaction: Transaction = {
            ...(result.transaction as any),
            createdAt: Number(result.transaction.createdAt) || Date.now()
          };
          setTransactions([newTransaction, ...transactions]);
        }

        // Mostrar confirmação com opções
        Alert.alert(
          "🎉 Depósito Confirmado!",
          `Valor: ${formatCurrency(depositAmount)}\n\n` +
          `Seu novo saldo: ${formatCurrency(newBalance)}`,
          [
            {
              text: "Continuar",
              onPress: () => {
                setAmountInput("");
                setDescription("");
              },
            },
            {
              text: "Ir para Cassino",
              onPress: () => router.push("/"),
              style: "default"
            }
          ]
        );
      } else {
        Alert.alert("Erro no Depósito", result.error || "Falha ao realizar depósito.");
      }
    } catch (error: any) {
      console.error("Erro no depósito:", error);
      Alert.alert("Erro", "Falha ao processar depósito.");
    } finally {
      setLoading(false);
    }
  };

  // Métodos de pagamento disponíveis
  const paymentMethods = [
    { id: "pix", name: "PIX", icon: "qr-code-outline", color: "#10B981" },
    { id: "credit", name: "Cartão", icon: "card-outline", color: "#3B82F6" },
    { id: "bank", name: "Transferência", icon: "business-outline", color: "#8B5CF6" },
  ];

  // Valores rápidos populares
  const quickAmounts = [
    { value: 10, label: "R$ 10" },
    { value: 50, label: "R$ 50" },
    { value: 100, label: "R$ 100" },
    { value: 500, label: "R$ 500" },
  ];

  if (loading && !user) {
    return (
      <View style={[styles.loadingContainer, {backgroundColor: theme.background}]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{color: theme.textSecondary, marginTop: 10}}>
          Carregando informações...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Cabeçalho Aprimorado */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          
          <View style={styles.headerTexts}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              Adicionar Saldo
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              Recarregue sua conta de forma segura
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.themeButton, { backgroundColor: theme.card }]}
            onPress={() => setIsDarkMode(!isDarkMode)}
          >
            <Ionicons 
              name={isDarkMode ? "sunny-outline" : "moon-outline"} 
              size={20} 
              color={theme.textPrimary} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Card de Saldo */}
        <View style={[styles.balanceCard, { backgroundColor: theme.primary }]}>
          <View style={styles.balanceHeader}>
            <Ionicons name="wallet-outline" size={24} color="white" />
            <Text style={styles.balanceLabel}>Saldo Atual</Text>
          </View>
          
          <Text style={styles.balanceValue}>
            {formatCurrency(balance)}
          </Text>
          
          <View style={styles.balanceInfo}>
            <View style={styles.infoItem}>
              <Ionicons name="person-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.infoText}>{user?.name || "Usuário"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.infoText}>
                Última atualização: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        </View>

        {/* Card de Depósito */}
        <View style={[styles.depositCard, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Valor do Depósito
            </Text>
            <TouchableOpacity onPress={() => setAmountInput("")}>
              <Text style={[styles.clearButton, { color: theme.primary }]}>
                Limpar
              </Text>
            </TouchableOpacity>
          </View>

          {/* Campo de Valor */}
          <View style={styles.amountInputContainer}>
            <Text style={[styles.currencySymbol, { color: theme.textSecondary }]}>
              R$
            </Text>
            <TextInput
              style={[
                styles.amountInput,
                {
                  color: theme.textPrimary,
                  borderBottomColor: theme.inputBorder,
                },
              ]}
              placeholder="0,00"
              placeholderTextColor={theme.placeholder}
              value={amountInput}
              onChangeText={handleAmountChange}
              keyboardType={Platform.select<KeyboardTypeOptions>({
                ios: 'decimal-pad',
                android: 'numeric',
                default: 'default'
              })}
              editable={!loading}
              textAlign="center"
            />
          </View>

          {/* Valores Rápidos */}
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            Valores Sugeridos:
          </Text>
          <View style={styles.quickAmountsGrid}>
            {quickAmounts.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.quickAmountButton,
                  { 
                    backgroundColor: theme.inputBg,
                    borderColor: amountInput === item.value.toFixed(2).replace('.', ',') 
                      ? theme.primary 
                      : theme.border,
                  },
                ]}
                onPress={() => handleQuickAmount(item.value)}
                disabled={loading}
              >
                <Text style={[
                  styles.quickAmountText,
                  { 
                    color: amountInput === item.value.toFixed(2).replace('.', ',') 
                      ? theme.primary 
                      : theme.textPrimary 
                  }
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Métodos de Pagamento */}
          <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 20 }]}>
            Método de Pagamento:
          </Text>
          <View style={styles.methodsGrid}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodButton,
                  { 
                    backgroundColor: theme.inputBg,
                    borderColor: selectedMethod === method.id 
                      ? method.color 
                      : theme.border,
                  },
                ]}
                onPress={() => setSelectedMethod(method.id)}
              >
                <View style={[
                  styles.methodIcon,
                  { backgroundColor: `${method.color}20` }
                ]}>
                  <Ionicons name={method.icon as any} size={24} color={method.color} />
                </View>
                <Text style={[
                  styles.methodName,
                  { 
                    color: selectedMethod === method.id 
                      ? theme.textPrimary 
                      : theme.textSecondary 
                  }
                ]}>
                  {method.name}
                </Text>
                {selectedMethod === method.id && (
                  <Ionicons 
                    name="checkmark-circle" 
                    size={20} 
                    color={method.color} 
                    style={styles.selectedIcon}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Descrição Opcional */}
          <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 20 }]}>
            Descrição (Opcional):
          </Text>
          <TextInput
            style={[
              styles.descriptionInput,
              {
                backgroundColor: theme.inputBg,
                borderColor: theme.inputBorder,
                color: theme.textPrimary,
              },
            ]}
            placeholder="Ex: Depósito via PIX para jogar no cassino"
            placeholderTextColor={theme.placeholder}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
            editable={!loading}
          />

          {/* Informações de Segurança */}
          <View style={[styles.securityInfo, { backgroundColor: `${theme.primary}10` }]}>
            <Ionicons name="shield-checkmark" size={20} color={theme.primary} />
            <Text style={[styles.securityText, { color: theme.textSecondary }]}>
              Pagamento 100% seguro • Processamento instantâneo • Sem taxas
            </Text>
          </View>

          {/* Botão de Confirmação */}
          <TouchableOpacity
            style={[
              styles.confirmButton,
              { backgroundColor: theme.primary },
              (!amountInput || loading) && styles.buttonDisabled,
            ]}
            onPress={handleDeposit}
            disabled={!amountInput || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={24} color="#FFF" />
                <Text style={styles.confirmButtonText}>
                  Confirmar Depósito
                </Text>
                <Text style={styles.confirmButtonSubtext}>
                  {amountInput ? `R$ ${amountInput}` : "Digite um valor"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Histórico de Transações */}
        <View style={[styles.historyCard, { backgroundColor: theme.card }]}>
          <View style={styles.historyHeader}>
            <View>
              <Text style={[styles.historyTitle, { color: theme.textPrimary }]}>
                Histórico Recente
              </Text>
              <Text style={[styles.historySubtitle, { color: theme.textSecondary }]}>
                Últimas transações
              </Text>
            </View>
            <TouchableOpacity
              onPress={loadUserData}
              style={[styles.refreshButton, { backgroundColor: theme.inputBg }]}
            >
              <Ionicons name="refresh" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: `${theme.primary}15` }]}>
                <Ionicons name="receipt-outline" size={40} color={theme.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                Nenhuma transação
              </Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Realize seu primeiro depósito
              </Text>
            </View>
          ) : (
            <>
              {transactions.slice(0, 3).map((transaction) => (
                <View
                  key={`${transaction.id}-${transaction.createdAt}`}
                  style={[
                    styles.transactionCard,
                    { backgroundColor: theme.background }
                  ]}
                >
                  <View style={styles.transactionHeader}>
                    <View style={styles.transactionIconContainer}>
                      <View style={[
                        styles.transactionIcon,
                        { 
                          backgroundColor: transaction.type === 'deposit' 
                            ? `${theme.success}15` 
                            : `${theme.error}15` 
                        }
                      ]}>
                        <Ionicons
                          name={transaction.type === 'deposit' ? "arrow-down" : "arrow-up"}
                          size={16}
                          color={transaction.type === 'deposit' ? theme.success : theme.error}
                        />
                      </View>
                      <View>
                        <Text style={[styles.transactionDescription, { color: theme.textPrimary }]}>
                          {transaction.description}
                        </Text>
                        <Text style={[styles.transactionDate, { color: theme.textSecondary }]}>
                          {formatDate(transaction.createdAt)}
                        </Text>
                      </View>
                    </View>
                    <Text style={[
                      styles.transactionAmount,
                      { color: transaction.type === 'deposit' ? theme.success : theme.error }
                    ]}>
                      {transaction.type === 'deposit' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </Text>
                  </View>
                  
                  <View style={styles.transactionFooter}>
                    <View style={[
                      styles.statusBadge,
                      { 
                        backgroundColor: transaction.status === 'completed' 
                          ? `${theme.success}15` 
                          : transaction.status === 'pending'
                          ? `${theme.warning}15`
                          : `${theme.error}15`
                      }
                    ]}>
                      <Ionicons
                        name={
                          transaction.status === 'completed' ? "checkmark-circle" :
                          transaction.status === 'pending' ? "time" : "close-circle"
                        }
                        size={12}
                        color={
                          transaction.status === 'completed' ? theme.success :
                          transaction.status === 'pending' ? theme.warning : theme.error
                        }
                      />
                      <Text style={[
                        styles.statusText,
                        {
                          color: transaction.status === 'completed' ? theme.success :
                                 transaction.status === 'pending' ? theme.warning : theme.error
                        }
                      ]}>
                        {transaction.status === 'completed' ? 'Concluído' :
                         transaction.status === 'pending' ? 'Pendente' : 'Falhou'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}

              {transactions.length > 3 && (
                <TouchableOpacity
                  style={styles.viewMoreButton}
                  onPress={() => Alert.alert("Em breve", "Histórico completo em desenvolvimento!")}
                >
                  <Text style={[styles.viewMoreText, { color: theme.primary }]}>
                    Ver todas as transações
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.primary} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Ações Rápidas */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.card }]}
            onPress={() => router.push("/")}
          >
            <Ionicons name="game-controller" size={24} color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.textPrimary }]}>
              Jogar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.card }]}
            onPress={() => router.push("/profile")}
          >
            <Ionicons name="person" size={24} color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.textPrimary }]}>
              Perfil
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.card }]}
            onPress={() => router.push("/withdraw")}
          >
            <Ionicons name="cash" size={24} color={theme.success} />
            <Text style={[styles.actionText, { color: theme.textPrimary }]}>
              Sacar
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
  },
  headerTexts: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  themeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Scroll View
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  
  // Balance Card
  balanceCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 10,
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  balanceLabel: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    opacity: 0.9,
  },
  balanceValue: {
    color: "white",
    fontSize: 40,
    fontWeight: "900",
    marginBottom: 20,
  },
  balanceInfo: {
    gap: 8,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
  },
  
  // Deposit Card
  depositCard: {
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  clearButton: {
    fontSize: 14,
    fontWeight: "600",
  },
  
  // Amount Input
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: "700",
    marginRight: 10,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: "900",
    borderBottomWidth: 2,
    paddingBottom: 10,
    minWidth: 180,
    textAlign: "center",
  },
  
  // Quick Amounts
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  quickAmountsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  quickAmountButton: {
    flex: 1,
    minWidth: "22%",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: "700",
  },
  
  // Payment Methods
  methodsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  methodButton: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    position: "relative",
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  methodName: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  selectedIcon: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  
  // Description Input
  descriptionInput: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    fontSize: 14,
    marginTop: 8,
    minHeight: 60,
    textAlignVertical: "top",
  },
  
  // Security Info
  securityInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 24,
    gap: 12,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
  },
  
  // Confirm Button
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    borderRadius: 16,
    gap: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
  confirmButtonSubtext: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    marginLeft: 8,
  },
  
  // History Card
  historyCard: {
    borderRadius: 20,
    padding: 24,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  historySubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.7,
  },
  
  // Transaction Cards
  transactionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  transactionIconContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: "700",
  },
  transactionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  
  // View More Button
  viewMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 8,
    gap: 6,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: "600",
  },
  
  // Quick Actions
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
  },
});