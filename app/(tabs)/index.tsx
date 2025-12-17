import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import {
  SQLiteService,
  User as DBUser,
} from '../../services/SQLiteService';
import { useFocusEffect } from '@react-navigation/native';

interface User {
  id: string;
  name: string;
  email: string;
  balance: number;
}

import { SYMBOLS, SymbolType } from '../../components/CasinoIcons';

const TouchableOpacityAnimated = Animated.createAnimatedComponent(TouchableOpacity);
const SYMBOL_HEIGHT = 80;
const REEL_WINDOW_HEIGHT = SYMBOL_HEIGHT;
const { width, height } = Dimensions.get('window');

// --- Componente REEL SIMPLIFICADO ---
type ReelProps = {
  symbol: SymbolType;
  index: number;
  isSpinning: boolean;
  allSymbols: SymbolType[];
  onStop?: (index: number) => void;
};

const Reel = React.memo(({
  symbol,
  index,
  isSpinning,
  allSymbols,
  onStop
}: ReelProps) => {
  const translateY = useSharedValue(0);
  const spinAnimation = useRef<any>(null);
  const isAnimating = useSharedValue(false);

  const extendedSymbols = React.useMemo(() => {
    return [...Array(15)].flatMap(() => allSymbols);
  }, [allSymbols]);

  useEffect(() => {
    if (spinAnimation.current) {
      clearTimeout(spinAnimation.current);
    }

    if (isSpinning) {
      isAnimating.value = true;
      const spinDuration = 2000 + (index * 300);
      const stopDelay = 500 + (index * 200);

      translateY.value = withTiming(
        -(allSymbols.length * SYMBOL_HEIGHT * 20),
        {
          duration: spinDuration,
          easing: Easing.linear,
        }
      );

      spinAnimation.current = setTimeout(() => {
        if (!isAnimating.value) return;

        const targetIndex = allSymbols.findIndex(s => s.id === symbol.id);
        if (targetIndex !== -1) {
          translateY.value = withTiming(
            -(targetIndex * SYMBOL_HEIGHT),
            {
              duration: 800,
              easing: Easing.out(Easing.back(1.5))
            },
            (finished) => {
              if (finished && onStop) {
                runOnJS(onStop)(index);
              }
              isAnimating.value = false;
            }
          );
        }
      }, spinDuration + stopDelay);

    } else {
      const targetIndex = allSymbols.findIndex(s => s.id === symbol.id);
      if (targetIndex !== -1) {
        translateY.value = withTiming(
          -(targetIndex * SYMBOL_HEIGHT),
          {
            duration: 300,
            easing: Easing.out(Easing.cubic)
          }
        );
      }
    }

    return () => {
      if (spinAnimation.current) {
        clearTimeout(spinAnimation.current);
      }
    };
  }, [isSpinning, symbol.id, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const renderSymbols = React.useCallback(() => {
    return extendedSymbols.map((s, i) => {
      const SymbolComponent = s.component;
      return (
        <View key={`${s.id}-${i}-${index}`} style={styles.symbolWrapper}>
          <SymbolComponent size={70} />
        </View>
      );
    });
  }, [extendedSymbols, index]);

  return (
    <View style={styles.reelContainer}>
      <View style={styles.reelWindow}>
        <Animated.View style={[styles.reelContent, animatedStyle]}>
          {renderSymbols()}
        </Animated.View>
        <View style={styles.reelOverlay} />
        <View style={styles.reelIndicator} />
      </View>
    </View>
  );
});

Reel.displayName = 'Reel';

export default function ProfessionalCasinoScreen() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState<number>(5);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [showBetModal, setShowBetModal] = useState<boolean>(false);
  const [customBet, setCustomBet] = useState<string>('');
  const [results, setResults] = useState<SymbolType[]>([SYMBOLS[0], SYMBOLS[0], SYMBOLS[0]]);
  const [winAmount, setWinAmount] = useState<number>(0);
  const [showWin, setShowWin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(false);

  const stoppedReels = useRef<number>(0);
  const spinData = useRef<{
    results: SymbolType[];
    userId: string;
    betAmount: number;
  } | null>(null);

  // Animações
  const machineScale = useSharedValue(1);
  const winPulse = useSharedValue(0);
  const glowOpacity = useSharedValue(0.3);
  const balanceAnimation = useSharedValue(0);
  const loadingProgress = useSharedValue(0);
  const welcomeModalScale = useSharedValue(0.8);
  const welcomeModalOpacity = useSharedValue(0);

  const updateBalanceWithAnimation = async (newBalance: number) => {
    balanceAnimation.value = 0;
    balanceAnimation.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.cubic)
    });
    setBalance(newBalance);
  };

  const reFetchBalance = useCallback(async () => {
    try {
      const email = await AsyncStorage.getItem('@loggedUserEmail');
      if (!email) {
        setBalance(50);
        return;
      }

      await SQLiteService.init();
      const userResult = await SQLiteService.getUserByEmail(email);

      if (userResult.success && userResult.user) {
        const newBalanceValue = Number(userResult.user.balance) || 0;
        await updateBalanceWithAnimation(newBalanceValue);
      } else {
        setBalance(50);
      }
    } catch (error) {
      console.error('Erro ao recarregar saldo:', error);
      setBalance(50);
    }
  }, [updateBalanceWithAnimation]);

  useFocusEffect(
    useCallback(() => {
      if (!isLoading) {
        reFetchBalance();
      }
      return () => {};
    }, [isLoading, reFetchBalance])
  );

  // Loading inicial
  useEffect(() => {
    loadingProgress.value = withTiming(1, {
      duration: 2000,
      easing: Easing.out(Easing.cubic)
    });

    const timer = setTimeout(() => {
      loadBalance();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Efeito de brilho
  useEffect(() => {
    const animateGlow = () => {
      glowOpacity.value = withSequence(
        withTiming(0.8, { duration: 1500, easing: Easing.ease }),
        withTiming(0.3, { duration: 1500, easing: Easing.ease })
      );
    };

    animateGlow();
    const interval = setInterval(animateGlow, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadBalance = async () => {
    try {
      setIsLoading(true);
      const welcomeShown = await AsyncStorage.getItem('@firstTimeVisit');

      if (!welcomeShown) {
        setTimeout(() => {
          setShowWelcomeModal(true);
          welcomeModalScale.value = withSpring(1, {
            damping: 15,
            stiffness: 120
          });
          welcomeModalOpacity.value = withTiming(1, { duration: 300 });
        }, 1500);
        await AsyncStorage.setItem('@firstTimeVisit', 'true');
      }

      const email = await AsyncStorage.getItem('@loggedUserEmail');
      if (!email) {
        setTimeout(() => {
          setShowWelcomeModal(true);
          welcomeModalScale.value = withSpring(1, {
            damping: 15,
            stiffness: 120
          });
          welcomeModalOpacity.value = withTiming(1, { duration: 300 });
        }, 1500);
        setBalance(50);
        return;
      }

      setUserEmail(email);
      await SQLiteService.init();
      const userResult = await SQLiteService.getUserByEmail(email);

      if (userResult.success && userResult.user) {
        const balanceValue = Number(userResult.user.balance) || 0;
        setBalance(balanceValue);

        const bonusGiven = await AsyncStorage.getItem(`@bonusGiven:${email}`);
        if (!bonusGiven) {
          const bonusAmount = 50;
          const result = await SQLiteService.createTransaction({
            userId: userResult.user.id,
            type: "deposit",
            amount: bonusAmount,
            description: "Bônus de Boas-Vindas do Cassino",
            status: "completed",
          });

          if (result.success) {
            const updatedUser = await SQLiteService.getUserByEmail(email);
            if (updatedUser.success && updatedUser.user) {
              setBalance(Number(updatedUser.user.balance));
            }
            await AsyncStorage.setItem(`@bonusGiven:${email}`, 'true');
            setTimeout(() => {
              Alert.alert('🎉 Bônus Adicionado!', `R$ ${bonusAmount.toFixed(2)} foram adicionados à sua conta!`);
            }, 2000);
          }
        }
      } else {
        setTimeout(() => {
          setShowWelcomeModal(true);
          welcomeModalScale.value = withSpring(1, {
            damping: 15,
            stiffness: 120
          });
          welcomeModalOpacity.value = withTiming(1, { duration: 300 });
        }, 1500);
        setBalance(50);
      }

      balanceAnimation.value = withTiming(1, {
        duration: 1000,
        easing: Easing.out(Easing.cubic)
      });
    } catch (error) {
      console.error('Erro ao carregar saldo:', error);
      setTimeout(() => {
        setShowWelcomeModal(true);
        welcomeModalScale.value = withSpring(1, {
          damping: 15,
          stiffness: 120
        });
        welcomeModalOpacity.value = withTiming(1, { duration: 300 });
      }, 1500);
      setBalance(50);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWelcomeClose = async () => {
    welcomeModalScale.value = withTiming(0.8, { duration: 200 });
    welcomeModalOpacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(setShowWelcomeModal)(false);
    });
  };

  const getWeightedRandomSymbol = (): SymbolType => {
    const totalWeight = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
    let random = Math.random() * totalWeight;

    for (const symbol of SYMBOLS) {
      random -= symbol.weight;
      if (random <= 0) {
        return symbol;
      }
    }
    return SYMBOLS[0];
  };

  const handleReelStop = (index: number) => {
    stoppedReels.current += 1;
    if (stoppedReels.current === 3 && spinData.current) {
      processWin(spinData.current.results, spinData.current.userId);
    }
  };

  const processWin = async (spinResults: SymbolType[], userId: string) => {
    const symbols = spinResults.map(r => r.id);
    let multiplier = 0;
    let winMessage = '';

    if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
      const symbol = spinResults[0];
      if (symbol.weight <= 3) multiplier = 50;
      else if (symbol.weight <= 5) multiplier = 25;
      else if (symbol.weight <= 8) multiplier = 15;
      else multiplier = 10;
      winMessage = `JACKPOT! 3x ${symbol.name}`;
    } else if (symbols[0] === symbols[1] || symbols[1] === symbols[2] || symbols[0] === symbols[2]) {
      multiplier = 2;
      winMessage = '2 símbolos iguais!';
    }

    const winValue = spinData.current?.betAmount ? spinData.current.betAmount * multiplier : 0;

    if (winValue > 0 && userEmail) {
      setWinAmount(winValue);
      const winDepositResult = await SQLiteService.createTransaction({
        userId: userId,
        type: "deposit",
        amount: winValue,
        description: `🏆 Vitória Cassino - ${winMessage} - R$ ${winValue.toFixed(2)}`,
        status: "completed",
      });

      if (winDepositResult.success) {
        const updatedUserResult = await SQLiteService.getUserByEmail(userEmail);
        let finalBalance = balance || 0;

        if (updatedUserResult.success && updatedUserResult.user) {
          finalBalance = Number(updatedUserResult.user.balance) || 0;
        }

        await updateBalanceWithAnimation(finalBalance);
        winPulse.value = withSequence(
          withSpring(1),
          withDelay(2000, withSpring(0))
        );

        setShowWin(true);
        setTimeout(() => {
          Alert.alert('🎊 Parabéns!', `${winMessage}\nVocê ganhou R$ ${winValue.toFixed(2)}!`);
        }, 1500);
      } else {
        Alert.alert('Erro', 'Falha ao registrar a vitória no saldo do DB.');
      }
    } else {
      setTimeout(() => {
        Alert.alert('😢 Tente Novamente', 'Não foi desta vez! Continue tentando!');
      }, 1000);
    }

    setIsSpinning(false);
    stoppedReels.current = 0;
    spinData.current = null;
  };

  const spin = async () => {
    if (isSpinning || balance === null || balance < betAmount || !userEmail) return;

    setIsSpinning(true);
    setWinAmount(0);
    setShowWin(false);
    stoppedReels.current = 0;

    machineScale.value = withSequence(
      withSpring(0.95),
      withSpring(1)
    );

    try {
      await SQLiteService.init();
      const userResult = await SQLiteService.getUserByEmail(userEmail);

      if (!userResult.success || !userResult.user) {
        throw new Error('Dados do usuário indisponíveis');
      }

      const userId = userResult.user.id;
      const deductionResult = await SQLiteService.createTransaction({
        userId: userId,
        type: "withdraw",
        amount: betAmount,
        description: `🎰 Aposta Cassino - R$ ${betAmount.toFixed(2)}`,
        status: "completed",
      });

      if (!deductionResult.success) {
        throw new Error(deductionResult.error || 'Falha ao deduzir a aposta');
      }

      const updatedUserResult = await SQLiteService.getUserByEmail(userEmail);
      if (updatedUserResult.success && updatedUserResult.user) {
        const finalBalance = Number(updatedUserResult.user.balance) || 0;
        setBalance(finalBalance);
      } else {
        setBalance(balance - betAmount);
      }

      const newResults = [
        getWeightedRandomSymbol(),
        getWeightedRandomSymbol(),
        getWeightedRandomSymbol()
      ];

      spinData.current = {
        results: newResults,
        userId,
        betAmount
      };

      setResults(newResults);
    } catch (error) {
      console.error('Erro no giro:', error);
      Alert.alert('Erro', error instanceof Error ? error.message : 'Erro ao processar a aposta');
      setIsSpinning(false);
      stoppedReels.current = 0;
      spinData.current = null;
    }
  };

  const handleCustomBet = () => {
    const amount = parseFloat(customBet.replace(',', '.'));
    if (isNaN(amount) || amount < 1 || balance === null || amount > balance) {
      Alert.alert('Valor Inválido', `Digite um valor entre R$ 1,00 e R$ ${balance?.toFixed(2) || '0.00'}`);
      return;
    }
    setBetAmount(amount);
    setShowBetModal(false);
    setCustomBet('');
  };

  // Estilos animados
  const machineAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: machineScale.value }]
  }));

  const winAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + winPulse.value * 0.2 }],
    opacity: 0.8 + winPulse.value * 0.2
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value
  }));

  const balanceAnimatedStyle = useAnimatedStyle(() => ({
    opacity: balanceAnimation.value,
    transform: [{
      translateY: interpolate(balanceAnimation.value, [0, 1], [10, 0])
    }]
  }));

  const loadingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(loadingProgress.value, [0, 0.5, 1], [1, 0.5, 0]),
    transform: [{
      scale: interpolate(loadingProgress.value, [0, 0.5, 1], [1, 1.1, 0.9])
    }]
  }));

  const welcomeModalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: welcomeModalScale.value }],
    opacity: welcomeModalOpacity.value,
  }));

  // Componentes de UI
  const PayoutItem = ({ symbol }: { symbol: SymbolType }) => {
    const SymbolComponent = symbol.component;
    let multiplier = '10x';
    if (symbol.weight <= 3) multiplier = '50x';
    else if (symbol.weight <= 5) multiplier = '25x';
    else if (symbol.weight <= 8) multiplier = '15x';

    return (
      <View style={styles.payoutCard}>
        <View style={[styles.payoutIcon, { backgroundColor: `${symbol.color}15` }]}>
          <SymbolComponent size={28} />
        </View>
        <View style={styles.payoutInfo}>
          <Text style={styles.payoutName}>{symbol.name}</Text>
          <Text style={styles.payoutMultiplier}>{multiplier}</Text>
          <Text style={styles.payoutChance}>
            Chance: {((1 / symbol.weight) * 100).toFixed(1)}%
          </Text>
        </View>
      </View>
    );
  };

  const LoadingSkeleton = () => (
    <View style={styles.loadingContainer}>
      <Animated.View style={[styles.loadingSkeleton, loadingAnimatedStyle]}>
        <View style={styles.loadingSpinner}>
          <Ionicons name="diamond" size={30} color="#FFD700" />
        </View>
        <Text style={styles.loadingText}>Carregando Cassino...</Text>
      </Animated.View>
    </View>
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0C0A1D" />

      {/* Header Premium Simplificado */}
      <View style={styles.header}>
        <View style={styles.headerBackground} />
        <View style={styles.headerContent}>
          {/* Botão do Menu */}
          <TouchableOpacity
            onPress={() => router.push('/profile')}
            style={styles.menuButton}
          >
            <Ionicons name="menu" size={24} color="#FFD700" />
          </TouchableOpacity>

          {/* Título Central */}
          <View style={styles.titleSection}>
            <Text style={styles.titleMain}>TIGRINHO</Text>
            <Text style={styles.titleSub}>Premium Casino</Text>
          </View>

          {/* Saldo */}
          <TouchableOpacity
            style={styles.balanceBadge}
            onPress={() => router.push('/deposit')}
          >
            <Ionicons name="wallet" size={16} color="#FFD700" />
            <Animated.Text style={[styles.balanceAmount, balanceAnimatedStyle]}>
              R$ {balance?.toFixed(2) || '0.00'}
            </Animated.Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Conteúdo Principal - Apenas a Máquina e Apostas Rápidas */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Máquina Cassino */}
        <Animated.View style={[styles.machineContainer, machineAnimatedStyle]}>
          {showWin && (
            <Animated.View style={[styles.winBanner, winAnimatedStyle]}>
              <Text style={styles.winText}>🏆 +R$ {winAmount.toFixed(2)}</Text>
            </Animated.View>
          )}

          <View style={styles.machine}>
            <View style={styles.reelsPanel}>
              <View style={styles.reelsContainer}>
                {results.map((symbol, index) => (
                  <Reel
                    key={index}
                    symbol={symbol}
                    index={index}
                    isSpinning={isSpinning}
                    allSymbols={SYMBOLS}
                    onStop={handleReelStop}
                  />
                ))}
              </View>
              <View style={styles.reelsFrame} />
            </View>

            <View style={styles.controlPanel}>
              <View style={styles.betSection}>
                <Text style={styles.betLabel}>Valor da Aposta</Text>
                <View style={styles.betAmountSection}>
                  <TouchableOpacity
                    style={styles.betAmountDisplay}
                    onPress={() => setShowBetModal(true)}
                  >
                    <Text style={styles.betAmountValue}>R$ {betAmount.toFixed(2)}</Text>
                    <Ionicons name="create-outline" size={18} color="#FFD700" />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.spinButton,
                  (isSpinning || balance === null || balance < betAmount) && styles.spinButtonDisabled
                ]}
                onPress={spin}
                disabled={isSpinning || balance === null || balance < betAmount}
              >
                <View style={styles.spinButtonContent}>
                  {isSpinning ? (
                    <>
                      <Ionicons name="refresh" size={24} color="#0C0A1D" />
                      <Text style={styles.spinButtonText}>GIRANDO...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="play-circle" size={32} color="#0C0A1D" />
                      <Text style={styles.spinButtonText}>GIRAR ROLETAS</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Apostas Rápidas */}
        <View style={styles.quickBetsSection}>
          <Text style={styles.sectionTitle}>Apostas Rápidas</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickBetsScroll}>
            {[1, 5, 10, 25, 50, 100].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.quickBetCard,
                  betAmount === amount && styles.quickBetCardActive,
                  (balance === null || balance < amount) && styles.quickBetCardDisabled
                ]}
                onPress={() => setBetAmount(amount)}
                disabled={balance === null || balance < amount}
              >
                <Text style={[
                  styles.quickBetAmount,
                  betAmount === amount && styles.quickBetAmountActive
                ]}>
                  R$ {amount}
                </Text>
                <Text style={styles.quickBetMultiplier}>
                  {amount === 100 ? 'MAX' : amount / betAmount === 1 ? 'ATUAL' : `${(amount / betAmount).toFixed(0)}x`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tabela de Pagamentos */}
        <View style={styles.payoutsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tabela de Pagamentos</Text>
            <TouchableOpacity onPress={() => Alert.alert('Como Funciona', 'Combine 3 símbolos iguais para ganhar!')}>
              <Ionicons name="information-circle" size={20} color="#FFD700" />
            </TouchableOpacity>
          </View>
          <View style={styles.payoutsGrid}>
            {SYMBOLS.map((symbol) => (
              <PayoutItem key={symbol.id} symbol={symbol} />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Modal de Boas-Vindas */}
      <Modal
        visible={showWelcomeModal}
        transparent
        animationType="none"
        onRequestClose={handleWelcomeClose}
        statusBarTranslucent
      >
        <View style={styles.welcomeModalOverlay}>
          <Animated.View style={[styles.welcomeModalContent, welcomeModalAnimatedStyle]}>
            <View style={styles.welcomeIconContainer}>
              <Ionicons name="trophy" size={70} color="#FFD700" />
            </View>
            
            <Text style={styles.welcomeTitle}>🎉 Bem-vindo! 🎉</Text>
            <Text style={styles.welcomeSubtitle}>Ao Cassino Premium</Text>
            
            <View style={styles.welcomeFeatures}>
              <View style={styles.featureItem}>
                <Ionicons name="diamond" size={20} color="#FFD700" />
                <Text style={styles.featureText}>Jogos emocionantes</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="cash" size={20} color="#FFD700" />
                <Text style={styles.featureText}>Prêmios reais</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="shield-checkmark" size={20} color="#FFD700" />
                <Text style={styles.featureText}>100% seguro</Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.startPlayingButton}
              onPress={handleWelcomeClose}
            >
              <Ionicons name="play-circle" size={28} color="#0C0A1D" />
              <Text style={styles.startPlayingButtonText}>Começar a Jogar</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal de Aposta Personalizada */}
      <Modal
        visible={showBetModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Valor da Aposta</Text>
            <Text style={styles.modalSubtitle}>
              Saldo disponível: R$ {balance?.toFixed(2) || '0.00'}
            </Text>
            
            <TextInput
              style={styles.betInput}
              placeholder="Digite o valor..."
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
              value={customBet}
              onChangeText={setCustomBet}
              autoFocus
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setShowBetModal(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={handleCustomBet}
              >
                <Text style={styles.modalButtonTextPrimary}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0A1D',
  },
  
  // Header
  header: {
    backgroundColor: '#0C0A1D',
    paddingTop: 55,
    paddingBottom: 15,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0C0A1D',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  menuButton: {
    padding: 8,
  },
  titleSection: {
    alignItems: 'center',
  },
  titleMain: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  titleSub: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 215, 0, 0.7)',
    letterSpacing: 0.5,
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1636',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFD700',
  },
  
  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // Machine
  machineContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  machine: {
    backgroundColor: '#1A1636',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  winBanner: {
    position: 'absolute',
    top: -20,
    alignSelf: 'center',
    zIndex: 100,
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  winText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  reelsPanel: {
    padding: 20,
    position: 'relative',
  },
  reelsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  reelContainer: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  reelWindow: {
    width: '100%',
    height: SYMBOL_HEIGHT * 3,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0C0A1D',
  },
  reelContent: {
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  symbolWrapper: {
    height: SYMBOL_HEIGHT,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reelOverlay: {
    position: 'absolute',
    top: SYMBOL_HEIGHT,
    left: 0,
    right: 0,
    height: SYMBOL_HEIGHT,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#FFD700',
    zIndex: 1,
  },
  reelIndicator: {
    position: 'absolute',
    top: SYMBOL_HEIGHT,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#FFD700',
    zIndex: 2,
  },
  reelsFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 4,
    borderColor: '#0C0A1D',
    borderRadius: 16,
    pointerEvents: 'none',
  },
  
  // Control Panel
  controlPanel: {
    padding: 20,
    backgroundColor: '#0C0A1D',
    borderTopWidth: 2,
    borderTopColor: '#1A1636',
  },
  betSection: {
    marginBottom: 20,
  },
  betLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  betAmountSection: {
    alignItems: 'center',
  },
  betAmountDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1636',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
    gap: 12,
  },
  betAmountValue: {
    color: '#FFD700',
    fontSize: 28,
    fontWeight: '800',
  },
  spinButton: {
    backgroundColor: '#FFD700',
    borderRadius: 16,
    overflow: 'hidden',
  },
  spinButtonDisabled: {
    backgroundColor: '#334155',
    opacity: 0.5,
  },
  spinButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  spinButtonText: {
    color: '#0C0A1D',
    fontSize: 18,
    fontWeight: '800',
  },
  
  // Quick Bets
  quickBetsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  quickBetsScroll: {
    flexDirection: 'row',
  },
  quickBetCard: {
    backgroundColor: '#1A1636',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  quickBetCardActive: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  quickBetCardDisabled: {
    opacity: 0.4,
  },
  quickBetAmount: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  quickBetAmountActive: {
    color: '#0C0A1D',
  },
  quickBetMultiplier: {
    fontSize: 12,
    color: '#94A3B8',
  },
  
  // Payouts
  payoutsSection: {
    marginBottom: 40, // Aumentado para dar mais espaço no final
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  payoutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  payoutCard: {
    width: (width - 52) / 2,
    backgroundColor: '#1A1636',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  payoutIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payoutInfo: {
    flex: 1,
  },
  payoutName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  payoutMultiplier: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  payoutChance: {
    color: '#94A3B8',
    fontSize: 12,
  },
  
  // Modals
  welcomeModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    padding: 20,
  },
  welcomeModalContent: {
    backgroundColor: '#1A1636',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  welcomeIconContainer: {
    marginBottom: 20,
  },
  welcomeTitle: {
    color: '#FFD700',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  welcomeFeatures: {
    width: '100%',
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  featureText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
  startPlayingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
  },
  startPlayingButtonText: {
    color: '#0C0A1D',
    fontSize: 18,
    fontWeight: '800',
  },
  
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1A1636',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  betInput: {
    backgroundColor: '#0C0A1D',
    color: '#FFF',
    padding: 16,
    borderRadius: 12,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: '#334155',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonTextSecondary: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: '#FFD700',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonTextPrimary: {
    color: '#0C0A1D',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0C0A1D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingSkeleton: {
    alignItems: 'center',
    padding: 40,
  },
  loadingSpinner: {
    marginBottom: 20,
  },
  loadingText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});