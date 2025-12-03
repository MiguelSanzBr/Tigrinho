// app/(tabs)/profile.tsx (ATUALIZADO)
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import { SQLiteService, Transaction } from "../../services/SQLiteService"; // ← Adicione Transaction
import { formatCurrency } from "../../utils/formatters";
import { Ionicons } from "@expo/vector-icons"; // ← Importe Ionicons

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]); // ← Novo estado

  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      const loggedUserEmail = await AsyncStorage.getItem("@loggedUserEmail");
      if (!loggedUserEmail) {
        router.replace("/login");
        return;
      }

      // Inicializar o SQLite
      await SQLiteService.init();

      const userResult = await SQLiteService.getUserByEmail(loggedUserEmail);
      if (userResult.success && userResult.user) {
        setUser(userResult.user);

        // Carrega transações do usuário
        const transactionsResult = await SQLiteService.getTransactionsByUserId(userResult.user.id);
        console.log("transactionsResult", transactionsResult);
        if (transactionsResult.success) {
          // Filtra apenas apostas e vitórias (deposit e withdraw)
          const casinoTransactions = transactionsResult.transactions.filter(
            t => t.description.includes("Cassino") ||
              t.description.includes("Slot") ||
              t.description.includes("Aposta") ||
              t.description.includes("Vitória")
          );
          console.log("casinoTransactions", casinoTransactions);
          setTransactions(casinoTransactions);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("@loggedUser");
      await AsyncStorage.removeItem("@loggedUserEmail");
      router.replace("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  // Função para calcular estatísticas
  const getStats = () => {
    const wins = transactions.filter(t =>
      t.type === 'deposit' && t.description.includes("Vitória")
    );
    const losses = transactions.filter(t =>
      t.type === 'withdraw' && t.description.includes("Aposta")
    );

    const totalWon = wins.reduce((sum, t) => sum + t.amount, 0);
    const totalLost = losses.reduce((sum, t) => sum + t.amount, 0);
    const netResult = totalWon - totalLost;

    return {
      totalWon,
      totalLost,
      netResult,
      winCount: wins.length,
      lossCount: losses.length,
      totalPlays: wins.length + losses.length
    };
  };

  const stats = getStats();
  const theme = isDarkMode ? darkTheme : lightTheme;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.buttonBg} />
        <Text style={{ color: theme.textSecondary, marginTop: 10 }}>
          Carregando perfil...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Perfil 👤
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.themeButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setIsDarkMode(!isDarkMode)}
          >
            <Text style={{ fontSize: 20 }}>{isDarkMode ? "☀️" : "🌙"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: theme.card }]}
            onPress={onRefresh}
          >
            <Ionicons name="refresh" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.buttonBg}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Card de Informações */}
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.avatarContainer}>
            <Text style={[styles.avatarText, { backgroundColor: theme.buttonBg }]}>
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>

          <Text style={[styles.userName, { color: theme.textPrimary }]}>
            {user?.name || "Usuário"}
          </Text>
          <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
            {user?.email || "email@exemplo.com"}
          </Text>

          {/* Saldo */}
          <View style={styles.balanceContainer}>
            <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>
              Saldo Atual
            </Text>
            <Text style={[styles.balanceValue, { color: theme.textPrimary }]}>
              {formatCurrency(user?.balance || 0)}
            </Text>
          </View>

          {/* ID do Usuário */}
          <View style={styles.idContainer}>
            <Text style={[styles.idLabel, { color: theme.textSecondary }]}>
              ID do Usuário:
            </Text>
            <Text style={[styles.idValue, { color: theme.textSecondary }]}>
              {user?.id?.substring(0, 8) || "N/A"}
            </Text>
          </View>

          {/* Data de Criação */}
          <View style={styles.dateContainer}>
            <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>
              Cadastrado em:
            </Text>
            <Text style={[styles.dateValue, { color: theme.textSecondary }]}>
              {new Date(user?.createdAt || new Date()).toLocaleDateString("pt-BR")}
            </Text>
          </View>
        </View>

        {/* Estatísticas do Jogo (NOVO) */}
        <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.statsTitle, { color: theme.textPrimary }]}>
            📊 Estatísticas do Cassino
          </Text>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>
                {stats.winCount}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Vitórias
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>
                {stats.lossCount}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Derrotas
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.textPrimary }]}>
                {stats.totalPlays}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Total Jogos
              </Text>
            </View>
          </View>

          <View style={styles.moneyStats}>
            <View style={styles.moneyStat}>
              <Ionicons name="trending-up" size={20} color="#10B981" />
              <Text style={[styles.moneyLabel, { color: theme.textSecondary }]}>Ganhou:</Text>
              <Text style={[styles.moneyValue, { color: '#10B981' }]}>
                {formatCurrency(stats.totalWon)}
              </Text>
            </View>

            <View style={styles.moneyStat}>
              <Ionicons name="trending-down" size={20} color="#EF4444" />
              <Text style={[styles.moneyLabel, { color: theme.textSecondary }]}>Perdeu:</Text>
              <Text style={[styles.moneyValue, { color: '#EF4444' }]}>
                {formatCurrency(stats.totalLost)}
              </Text>
            </View>

            <View style={[styles.moneyStat, styles.netResult]}>
              <Ionicons
                name={stats.netResult >= 0 ? "happy" : "sad"}
                size={20}
                color={stats.netResult >= 0 ? '#10B981' : '#EF4444'}
              />
              <Text style={[styles.moneyLabel, { color: theme.textSecondary }]}>Resultado:</Text>
              <Text style={[
                styles.moneyValue,
                { color: stats.netResult >= 0 ? '#10B981' : '#EF4444' }
              ]}>
                {formatCurrency(stats.netResult)}
              </Text>
            </View>
          </View>
        </View>

        {/* Histórico de Transações (NOVO) */}
        <View style={[styles.historyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.historyHeader}>
            <Text style={[styles.historyTitle, { color: theme.textPrimary }]}>
              🎰 Histórico do Cassino
            </Text>
            <Text style={[styles.historySubtitle, { color: theme.textSecondary }]}>
              Últimas {transactions.length} transações
            </Text>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="game-controller-outline" size={50} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Nenhuma jogada registrada ainda
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                Vá até o cassino e comece a jogar!
              </Text>
            </View>
          ) : (
            transactions.slice(0, 10).map((transaction) => (
              <View
                key={transaction.id}
                style={[
                  styles.transactionItem,
                  { borderBottomColor: theme.border }
                ]}
              >
                <View style={styles.transactionLeft}>
                  <View style={[
                    styles.transactionIcon,
                    { backgroundColor: transaction.type === 'deposit' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
                  ]}>
                    <Ionicons
                      name={transaction.type === 'deposit' ? "arrow-down-circle" : "arrow-up-circle"}
                      size={20}
                      color={transaction.type === 'deposit' ? '#10B981' : '#EF4444'}
                    />
                  </View>
                  <View>
                    <Text style={[styles.transactionDesc, { color: theme.textPrimary }]}>
                      {transaction.description}
                    </Text>
                    <Text style={[styles.transactionDate, { color: theme.textSecondary }]}>
                      {new Date(transaction.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                </View>

                <View style={styles.transactionRight}>
                  <Text style={[
                    styles.transactionAmount,
                    { color: transaction.type === 'deposit' ? '#10B981' : '#EF4444' }
                  ]}>
                    {transaction.type === 'deposit' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: transaction.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: transaction.status === 'completed' ? '#10B981' : '#EF4444' }
                    ]}>
                      {transaction.status === 'completed' ? 'Concluído' : 'Pendente'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}

          {transactions.length > 10 && (
            <TouchableOpacity
              style={styles.viewMoreButton}
              onPress={() => Alert.alert("Em breve", "Histórico completo em desenvolvimento!")}
            >
              <Text style={[styles.viewMoreText, { color: theme.buttonBg }]}>
                Ver histórico completo ({transactions.length})
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.buttonBg} />
            </TouchableOpacity>
          )}
        </View>

        {/* Botões de Ação */}
        <View style={[styles.actionsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.buttonBg }]}
            onPress={() => router.push("/")}
          >
            <Ionicons name="game-controller" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Voltar ao Cassino</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.buttonBg }]}
            onPress={() => router.push("/deposit")}
          >
            <Ionicons name="add-circle" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Fazer Depósito</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.logoutButton, { borderColor: theme.withdrawColor }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color={theme.withdrawColor} />
            <Text style={[styles.logoutButtonText, { color: theme.withdrawColor }]}>
              Sair da Conta
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// Temas
const darkTheme = {
  background: "#0f0b1a",
  card: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.15)",
  textPrimary: "#ffffff",
  textSecondary: "#cbd5e1",
  buttonBg: "#3b82f6",
  withdrawColor: "#ef4444",
};

const lightTheme = {
  background: "#f1f5f9",
  card: "#ffffff",
  border: "#e2e8f0",
  textPrimary: "#111827",
  textSecondary: "#475569",
  buttonBg: "#2563eb",
  withdrawColor: "#ef4444",
};

// Estilos (ATUALIZADOS)
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 10,
  },
  themeButton: {
    borderRadius: 20,
    padding: 6,
    borderWidth: 1,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  refreshButton: {
    borderRadius: 20,
    padding: 6,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  infoCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarText: {
    width: 80,
    height: 80,
    borderRadius: 40,
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    lineHeight: 80,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    marginBottom: 20,
  },
  balanceContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: "bold",
  },
  idContainer: {
    width: "100%",
    marginBottom: 12,
  },
  idLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  idValue: {
    fontSize: 11,
    fontFamily: "monospace",
  },
  dateContainer: {
    width: "100%",
  },
  dateLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  // NOVOS ESTILOS PARA ESTATÍSTICAS
  statsCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  moneyStats: {
    gap: 12,
  },
  moneyStat: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  netResult: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  moneyLabel: {
    fontSize: 14,
    marginLeft: 10,
    marginRight: "auto",
  },
  moneyValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  // NOVOS ESTILOS PARA HISTÓRICO
  historyCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  historyHeader: {
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  historySubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyHistory: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 10,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 12,
    marginTop: 5,
    textAlign: "center",
  },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  transactionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  transactionDesc: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 11,
  },
  transactionRight: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  viewMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 10,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 4,
  },
  // Estilos existentes
  actionsCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 10,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    gap: 10,
  },
  logoutButtonText: {
    fontWeight: "600",
    fontSize: 16,
  },
});