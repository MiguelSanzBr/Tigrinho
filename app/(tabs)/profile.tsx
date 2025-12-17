// app/(tabs)/profile.tsx (ATUALIZADO - FRONT-END MELHORADO)
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
import { SQLiteService, Transaction } from "../../services/SQLiteService";
import { formatCurrency } from "../../utils/formatters";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

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

      await SQLiteService.init();
      const userResult = await SQLiteService.getUserByEmail(loggedUserEmail);
      
      if (userResult.success && userResult.user) {
        setUser(userResult.user);
        const transactionsResult = await SQLiteService.getTransactionsByUserId(userResult.user.id);
        
        if (transactionsResult.success) {
          const casinoTransactions = transactionsResult.transactions.filter(
            t => t.description.includes("Cassino") ||
              t.description.includes("Slot") ||
              t.description.includes("Aposta") ||
              t.description.includes("Vitória")
          );
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
    Alert.alert(
      "Sair da Conta",
      "Tem certeza que deseja sair?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sair", 
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("@loggedUser");
              await AsyncStorage.removeItem("@loggedUserEmail");
              router.replace("/login");
            } catch (error) {
              console.error("Erro ao fazer logout:", error);
            }
          }
        }
      ]
    );
  };

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
      totalPlays: wins.length + losses.length,
      winRate: wins.length > 0 ? (wins.length / (wins.length + losses.length) * 100).toFixed(1) : "0.0"
    };
  };

  const stats = getStats();
  const theme = isDarkMode ? darkTheme : lightTheme;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.textSecondary, marginTop: 10 }}>
          Carregando perfil...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Cabeçalho Aprimorado */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            👤 Meu Perfil
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Gerencie sua conta e visualize estatísticas
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.card }]}
            onPress={() => setIsDarkMode(!isDarkMode)}
          >
            <Ionicons 
              name={isDarkMode ? "sunny" : "moon"} 
              size={22} 
              color={theme.textPrimary} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.card }]}
            onPress={onRefresh}
          >
            <Ionicons 
              name="refresh-circle" 
              size={22} 
              color={theme.primary} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Card de Informações do Usuário - REDESENHADO */}
        <View style={[styles.profileCard, { backgroundColor: theme.card }]}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatarContainer, { backgroundColor: `${theme.primary}20` }]}>
              <Text style={[styles.avatarText, { color: theme.primary }]}>
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.userName, { color: theme.textPrimary }]}>
                {user?.name || "Usuário"}
              </Text>
              <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
                {user?.email || "email@exemplo.com"}
              </Text>
              <View style={styles.userBadge}>
                <Ionicons name="shield-checkmark" size={12} color={theme.success} />
                <Text style={[styles.badgeText, { color: theme.success }]}>
                  Conta Verificada
                </Text>
              </View>
            </View>
          </View>

          {/* Saldo em Destaque */}
          <View style={[styles.balanceCard, { backgroundColor: `${theme.primary}10` }]}>
            <View style={styles.balanceHeader}>
              <Ionicons name="wallet-outline" size={20} color={theme.textSecondary} />
              <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>
                Saldo Disponível
              </Text>
            </View>
            <Text style={[styles.balanceValue, { color: theme.textPrimary }]}>
              {formatCurrency(user?.balance || 0)}
            </Text>
            <View style={styles.balanceFooter}>
              <View style={styles.balanceInfo}>
                <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.balanceInfoText, { color: theme.textSecondary }]}>
                  Desde {new Date(user?.createdAt || new Date()).toLocaleDateString("pt-BR")}
                </Text>
              </View>
              <View style={styles.balanceInfo}>
                <Ionicons name="key-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.balanceInfoText, { color: theme.textSecondary }]}>
                  ID: {user?.id?.substring(0, 8) || "N/A"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Estatísticas - LAYOUT MELHORADO */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            📈 Estatísticas do Jogo
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            Desempenho no cassino
          </Text>
        </View>

        <View style={styles.statsContainer}>
          {/* Cartões de Estatísticas */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.card }]}>
              <View style={[styles.statIcon, { backgroundColor: `${theme.success}15` }]}>
                <Ionicons name="trophy" size={24} color={theme.success} />
              </View>
              <Text style={[styles.statNumber, { color: theme.textPrimary }]}>
                {stats.winCount}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Vitórias
              </Text>
              <Text style={[styles.statRate, { color: theme.success }]}>
                {stats.winRate}% de taxa
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.card }]}>
              <View style={[styles.statIcon, { backgroundColor: `${theme.error}15` }]}>
                <Ionicons name="trending-down" size={24} color={theme.error} />
              </View>
              <Text style={[styles.statNumber, { color: theme.textPrimary }]}>
                {stats.lossCount}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Derrotas
              </Text>
              <Text style={[styles.statSubLabel, { color: theme.textSecondary }]}>
                Total de jogos: {stats.totalPlays}
              </Text>
            </View>
          </View>

          {/* Resumo Financeiro */}
          <View style={[styles.financialSummary, { backgroundColor: theme.card }]}>
            <View style={styles.financialHeader}>
              <Ionicons name="cash-outline" size={20} color={theme.textPrimary} />
              <Text style={[styles.financialTitle, { color: theme.textPrimary }]}>
                Resumo Financeiro
              </Text>
            </View>
            
            <View style={styles.financialItems}>
              <View style={styles.financialItem}>
                <View style={styles.financialItemLeft}>
                  <View style={[styles.itemIcon, { backgroundColor: `${theme.success}15` }]}>
                    <Ionicons name="arrow-down-circle" size={16} color={theme.success} />
                  </View>
                  <Text style={[styles.itemLabel, { color: theme.textSecondary }]}>Ganhos</Text>
                </View>
                <Text style={[styles.itemValue, { color: theme.success }]}>
                  +{formatCurrency(stats.totalWon)}
                </Text>
              </View>

              <View style={styles.financialItem}>
                <View style={styles.financialItemLeft}>
                  <View style={[styles.itemIcon, { backgroundColor: `${theme.error}15` }]}>
                    <Ionicons name="arrow-up-circle" size={16} color={theme.error} />
                  </View>
                  <Text style={[styles.itemLabel, { color: theme.textSecondary }]}>Perdas</Text>
                </View>
                <Text style={[styles.itemValue, { color: theme.error }]}>
                  -{formatCurrency(stats.totalLost)}
                </Text>
              </View>

              <View style={[styles.financialItem, styles.netResultItem]}>
                <View style={styles.financialItemLeft}>
                  <View style={[
                    styles.itemIcon, 
                    { backgroundColor: stats.netResult >= 0 ? `${theme.success}15` : `${theme.error}15` }
                  ]}>
                    <Ionicons 
                      name={stats.netResult >= 0 ? "happy" : "sad"} 
                      size={16} 
                      color={stats.netResult >= 0 ? theme.success : theme.error} 
                    />
                  </View>
                  <Text style={[styles.itemLabel, { color: theme.textSecondary }]}>Saldo Final</Text>
                </View>
                <Text style={[
                  styles.itemValue, 
                  { color: stats.netResult >= 0 ? theme.success : theme.error }
                ]}>
                  {stats.netResult >= 0 ? '+' : ''}{formatCurrency(stats.netResult)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Histórico de Transações - MELHORADO */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            🎮 Histórico de Jogos
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            Últimas atividades
          </Text>
        </View>

        <View style={[styles.historyCard, { backgroundColor: theme.card }]}>
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: `${theme.primary}10` }]}>
                <Ionicons name="game-controller" size={40} color={theme.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                Nenhuma jogada registrada
              </Text>
              <Text style={[styles.emptyDescription, { color: theme.textSecondary }]}>
                Suas jogadas no cassino aparecerão aqui
              </Text>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: theme.primary }]}
                onPress={() => router.push("/")}
              >
                <Ionicons name="play" size={16} color="#FFF" />
                <Text style={styles.emptyButtonText}>Começar a Jogar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {transactions.slice(0, 5).map((transaction) => (
                <View
                  key={transaction.id}
                  style={[styles.transactionCard, { backgroundColor: theme.background }]}
                >
                  <View style={styles.transactionHeader}>
                    <View style={styles.transactionType}>
                      <View style={[
                        styles.typeIcon,
                        { backgroundColor: transaction.type === 'deposit' ? `${theme.success}15` : `${theme.error}15` }
                      ]}>
                        <Ionicons
                          name={transaction.type === 'deposit' ? "trending-up" : "trending-down"}
                          size={16}
                          color={transaction.type === 'deposit' ? theme.success : theme.error}
                        />
                      </View>
                      <View>
                        <Text style={[styles.transactionTitle, { color: theme.textPrimary }]}>
                          {transaction.description}
                        </Text>
                        <Text style={[styles.transactionTime, { color: theme.textSecondary }]}>
                          {new Date(transaction.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
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
                      { backgroundColor: transaction.status === 'completed' ? `${theme.success}15` : `${theme.warning}15` }
                    ]}>
                      <Ionicons
                        name={transaction.status === 'completed' ? "checkmark-circle" : "time-outline"}
                        size={12}
                        color={transaction.status === 'completed' ? theme.success : theme.warning}
                      />
                      <Text style={[
                        styles.statusText,
                        { color: transaction.status === 'completed' ? theme.success : theme.warning }
                      ]}>
                        {transaction.status === 'completed' ? 'Concluído' : 'Pendente'}
                      </Text>
                    </View>
                    <Text style={[styles.transactionId, { color: theme.textSecondary }]}>
                      #{transaction.id.substring(0, 6)}
                    </Text>
                  </View>
                </View>
              ))}

              {transactions.length > 5 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => Alert.alert("Em breve", "Histórico completo em desenvolvimento!")}
                >
                  <Text style={[styles.viewAllText, { color: theme.primary }]}>
                    Ver todas as transações ({transactions.length})
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.primary} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Ações Rápidas */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            ⚡ Ações Rápidas
          </Text>
        </View>

        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.card }]}
            onPress={() => router.push("/")}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${theme.primary}15` }]}>
              <Ionicons name="game-controller" size={24} color={theme.primary} />
            </View>
            <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>Jogar</Text>
            <Text style={[styles.actionDescription, { color: theme.textSecondary }]}>
              Voltar ao cassino
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.card }]}
            onPress={() => router.push("/deposit")}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${theme.success}15` }]}>
              <Ionicons name="add-circle" size={24} color={theme.success} />
            </View>
            <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>Depositar</Text>
            <Text style={[styles.actionDescription, { color: theme.textSecondary }]}>
              Adicionar saldo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.card }]}
            onPress={() => router.push("/withdraw")}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${theme.warning}15` }]}>
              <Ionicons name="cash-outline" size={24} color={theme.warning} />
            </View>
            <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>Sacar</Text>
            <Text style={[styles.actionDescription, { color: theme.textSecondary }]}>
              Retirar ganhos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.card }]}
            onPress={() => Alert.alert("Em breve", "Histórico completo em desenvolvimento!")}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${theme.info}15` }]}>
              <Ionicons name="stats-chart" size={24} color={theme.info} />
            </View>
            <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>Relatórios</Text>
            <Text style={[styles.actionDescription, { color: theme.textSecondary }]}>
              Análise detalhada
            </Text>
          </TouchableOpacity>
        </View>

        {/* Botão de Logout */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: `${theme.error}10` }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.error} />
          <Text style={[styles.logoutText, { color: theme.error }]}>
            Sair da Conta
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Última atualização: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// Temas Aprimorados
const darkTheme = {
  background: "#0F172A",
  card: "#1E293B",
  primary: "#3B82F6",
  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
  info: "#8B5CF6",
  textPrimary: "#F1F5F9",
  textSecondary: "#94A3B8",
  border: "#334155",
};

const lightTheme = {
  background: "#F8FAFC",
  card: "#FFFFFF",
  primary: "#2563EB",
  success: "#059669",
  error: "#DC2626",
  warning: "#D97706",
  info: "#7C3AED",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  border: "#E2E8F0",
};

// Estilos Completamente Reformulados
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
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
  
  // Profile Card
  profileCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "bold",
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.8,
  },
  userBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  
  // Balance Card
  balanceCard: {
    borderRadius: 16,
    padding: 20,
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 16,
  },
  balanceFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  balanceInfoText: {
    fontSize: 12,
  },
  
  // Section Headers
  sectionHeader: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  
  // Stats
  statsContainer: {
    gap: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 2,
  },
  statRate: {
    fontSize: 11,
    fontWeight: "600",
  },
  statSubLabel: {
    fontSize: 11,
    opacity: 0.7,
  },
  
  // Financial Summary
  financialSummary: {
    borderRadius: 16,
    padding: 20,
  },
  financialHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  financialTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  financialItems: {
    gap: 14,
  },
  financialItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  netResultItem: {
    borderBottomWidth: 0,
    paddingTop: 16,
  },
  financialItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  itemValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  
  // History
  historyCard: {
    borderRadius: 16,
    padding: 20,
  },
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
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    opacity: 0.7,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },
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
  transactionType: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  transactionTime: {
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
  transactionId: {
    fontSize: 11,
    fontFamily: "monospace",
    opacity: 0.6,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(59, 130, 246, 0.3)",
    marginTop: 8,
    gap: 6,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  
  // Actions Grid
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionButton: {
    width: "48%",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  actionDescription: {
    fontSize: 11,
    textAlign: "center",
    opacity: 0.7,
  },
  
  // Logout Button
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    marginTop: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
  
  // Footer
  footer: {
    alignItems: "center",
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    opacity: 0.6,
  },
});