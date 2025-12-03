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

// --- Componente REEL SIMPLIFICADO ---
type ReelProps = {
  symbol: SymbolType;
  index: number;
  isSpinning: boolean;
  allSymbols: SymbolType[];
  onStop?: (index: number) => void;
};

const Reel = ({
  symbol,
  index,
  isSpinning,
  allSymbols,
  onStop
}: ReelProps) => {
  const translateY = useSharedValue(0);
  const totalSymbols = allSymbols.length;

  const extendedSymbols = useRef([
    ...allSymbols,
    ...allSymbols,
    ...allSymbols,
    ...allSymbols,
    ...allSymbols,
  ]);

  useEffect(() => {
    let isCurrentAnimationValid = true;

    if (isSpinning) {
      translateY.value = 0;

      const spinDuration = 50;
      const totalSpins = totalSymbols * 8;
      const totalDuration = spinDuration * totalSpins;

      translateY.value = withTiming(
        -(totalSpins * SYMBOL_HEIGHT),
        {
          duration: totalDuration,
          easing: Easing.linear,
        },
        (finished) => {
          if (finished && onStop && isCurrentAnimationValid) {
            runOnJS(onStop)(index);
          }
        }
      );
    } else {
      const targetIndex = allSymbols.findIndex(s => s.id === symbol.id);
      if (targetIndex !== -1) {
        translateY.value = withTiming(
          -(targetIndex * SYMBOL_HEIGHT),
          {
            duration: 800,
            easing: Easing.out(Easing.back(1.5))
          }
        );
      }
    }

    return () => {
      isCurrentAnimationValid = false;
      translateY.value = translateY.value;
    };
  }, [isSpinning, symbol, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const renderSymbols = () => {
    return extendedSymbols.current.map((s, i) => {
      const SymbolComponent = s.component;
      return (
        <View key={`${s.id}-${i}-${index}`} style={styles.symbolWrapper}>
          <SymbolComponent size={70} />
        </View>
      );
    });
  };

  return (
    <View style={styles.reelContainer}>
      <View style={styles.reelWindow}>
        <Animated.View style={[styles.reelContent, animatedStyle]}>
          {renderSymbols()}
        </Animated.View>
      </View>
      <View style={[styles.reelOverlay, { borderColor: symbol.color }]} />
      <View style={styles.reelIndicator} />
    </View>
  );
};
// --- FIM DO COMPONENTE REEL ---

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
  const [showWelcomeBonus, setShowWelcomeBonus] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(false);


  // Contador para rolos que já pararam
  const stoppedReels = useRef<number>(0);


  // Referência para armazenar dados temporários da rotação atual
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

  // 2. FUNÇÃO DE RECARGA DINÂMICA (useCallback, agora pode acessar updateBalanceWithAnimation)
  const reFetchBalance = useCallback(async () => {
    try {
      const email = await AsyncStorage.getItem('@loggedUserEmail');
      if (!email) {
        setBalance(50);
        return;
      }

      await SQLiteService.init();
      const userResult = await SQLiteService.getUserByEmail(email);

      // CORREÇÃO: 'setResults.success' não existe. Deve ser 'userResult.success'
      if (userResult.success && userResult.user) {
        const newBalanceValue = Number(userResult.user.balance) || 0;
        await updateBalanceWithAnimation(newBalanceValue);
      } else {
        console.warn('Usuário não encontrado ao recarregar saldo:', email);
        setBalance(50);
      }

    } catch (error) {
      console.error('Erro ao recarregar saldo dinamicamente:', error);
      setBalance(50);
    }
  }, [updateBalanceWithAnimation]); // Dependência: Função de Animação

  // 3. HOOK DE FOCO (useFocusEffect, agora pode acessar reFetchBalance)
  useFocusEffect(
    useCallback(() => {
      if (!isLoading) {
        reFetchBalance();
      }

      return () => {
        // Cleanup
      };
    }, [isLoading, reFetchBalance])
  );
  const getBonusKey = (email: string) => `@bonusClaimed:${email}`;
  const getWelcomeShownKey = (email: string) => `@welcomeShown:${email}`;

  // Efeito de loading inicial
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

  // Efeito de brilho contínuo
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

      // Verifica se já mostrou modal de boas-vindas antes de verificar login
      const welcomeShown = await AsyncStorage.getItem('@firstTimeVisit');

      // Se for primeira visita, mostra modal imediatamente
      if (!welcomeShown) {
        setTimeout(() => {
          setShowWelcomeModal(true);
          welcomeModalScale.value = withSpring(1, {
            damping: 15,
            stiffness: 120
          });
          welcomeModalOpacity.value = withTiming(1, { duration: 300 });
        }, 1500);

        // Marca que já mostrou o modal
        await AsyncStorage.setItem('@firstTimeVisit', 'true');
      }

      const email = await AsyncStorage.getItem('@loggedUserEmail');

      if (!email) {
        // Se não tem usuário logado, mostra modal de boas-vindas primeiro
        setTimeout(() => {
          setShowWelcomeModal(true);
          welcomeModalScale.value = withSpring(1, {
            damping: 15,
            stiffness: 120
          });
          welcomeModalOpacity.value = withTiming(1, { duration: 300 });
        }, 1500);

        // Não impede o acesso - permite jogar sem login (ou redireciona depois)
        setBalance(50); // Saldo inicial para testar
        return;
      }

      setUserEmail(email);

      await SQLiteService.init();
      const userResult = await SQLiteService.getUserByEmail(email);

      if (userResult.success && userResult.user) {
        const balanceValue = Number(userResult.user.balance) || 0;
        setBalance(balanceValue);

        // Verifica se já deu bônus de R$ 50,00
        const bonusGiven = await AsyncStorage.getItem(`@bonusGiven:${email}`);

        if (!bonusGiven) {
          // Dá bônus de R$ 50,00 para novo usuário
          const bonusAmount = 50;
          const result = await SQLiteService.createTransaction({
            userId: userResult.user.id,
            type: "deposit",
            amount: bonusAmount,
            description: "Bônus de Boas-Vindas do Cassino",
            status: "completed",
          });

          if (result.success) {
            // Atualiza saldo
            const updatedUser = await SQLiteService.getUserByEmail(email);
            if (updatedUser.success && updatedUser.user) {
              setBalance(Number(updatedUser.user.balance));
            }

            // Marca que já deu bônus
            await AsyncStorage.setItem(`@bonusGiven:${email}`, 'true');

            // Atualiza mensagem do modal se ainda estiver aberto
            setTimeout(() => {
              Alert.alert('🎉 Bônus Adicionado!', `R$ ${bonusAmount.toFixed(2)} foram adicionados à sua conta!`);
            }, 2000);
          }
        }
      } else {
        // Se usuário não existe no banco, ainda mostra modal
        setTimeout(() => {
          setShowWelcomeModal(true);
          welcomeModalScale.value = withSpring(1, {
            damping: 15,
            stiffness: 120
          });
          welcomeModalOpacity.value = withTiming(1, { duration: 300 });
        }, 1500);

        setBalance(50); // Saldo inicial para testar
      }

      balanceAnimation.value = withTiming(1, {
        duration: 1000,
        easing: Easing.out(Easing.cubic)
      });

    } catch (error) {
      console.error('Erro ao carregar saldo:', error);
      // Mesmo com erro, mostra modal de boas-vindas
      setTimeout(() => {
        setShowWelcomeModal(true);
        welcomeModalScale.value = withSpring(1, {
          damping: 15,
          stiffness: 120
        });
        welcomeModalOpacity.value = withTiming(1, { duration: 300 });
      }, 1500);
      setBalance(50); // Saldo inicial para testar
    } finally {
      setIsLoading(false);
    }
  };
  const handleWelcomeClose = async (goToLogin: boolean = false) => {
    try {
      // Animações de saída
      welcomeModalScale.value = withTiming(0.8, { duration: 200 });
      welcomeModalOpacity.value = withTiming(0, { duration: 200 }, () => {
        runOnJS(setShowWelcomeModal)(false);

        // Se foi solicitado ir para login
        if (goToLogin) {
          runOnJS(router.push)('/login');
        }
      });

    } catch (error) {
      console.error('Erro ao fechar modal:', error);
      setShowWelcomeModal(false);

      // Ainda redireciona se houve erro
      if (goToLogin) {
        router.push('/login');
      }
    }
  };
  const claimWelcomeBonus = async () => {
    if (!userEmail || balance === null) return;

    try {
      const bonusKey = getBonusKey(userEmail);
      const bonusClaimed = await AsyncStorage.getItem(bonusKey);

      if (!bonusClaimed) {
        const bonusAmount = 30;

        const userResult = await SQLiteService.getUserByEmail(userEmail);
        if (!userResult.success || !userResult.user) {
          Alert.alert('Erro', 'Usuário indisponível para bônus.');
          return;
        }

        const result = await SQLiteService.createTransaction({
          userId: userResult.user.id,
          type: "deposit",
          amount: bonusAmount,
          description: "Bônus de Boas-Vindas do Cassino",
          status: "completed",
        });

        if (result.success) {
          await loadBalance();
          await AsyncStorage.setItem(bonusKey, 'true');
          setShowWelcomeBonus(false);

          setTimeout(() => {
            Alert.alert('🎉 Bônus Ativado!', `Parabéns! Você ganhou R$ ${bonusAmount.toFixed(2)} de bônus!`);
          }, 500);
        } else {
          Alert.alert('Erro', 'Não foi possível registrar o bônus no DB.');
        }
      }
    } catch (error) {
      console.error('Erro ao ativar bônus:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao resgatar o bônus.');
    }
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

  // Callback quando um reel para
  const handleReelStop = (index: number) => {
    stoppedReels.current += 1;

    // Quando todos os 3 rolos pararem
    if (stoppedReels.current === 3 && spinData.current) {
      processWin(spinData.current.results, spinData.current.userId);
    }
  };

  // Processa vitória separadamente
  const processWin = async (spinResults: SymbolType[], userId: string) => {
    const symbols = spinResults.map(r => r.id);
    let multiplier = 0;
    let winMessage = '';

    // Verifica combinações
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
        description: `🏆 Vitória Cassino - ${winMessage} - R$ ${winValue.toFixed(2)}`, // ← NOVA DESCRIÇÃO
        status: "completed",
      });
      console.log(winDepositResult, "feito a vitoria no db")
      console.log('Cassino - userId:', userId);
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

    // Reseta estados
    setIsSpinning(false);
    stoppedReels.current = 0;
    spinData.current = null;
  };

  // Função de giro simplificada
  const spin = async () => {
    if (isSpinning || balance === null || balance < betAmount || !userEmail) return;

    // Prepara para nova rotação
    setIsSpinning(true);
    setWinAmount(0);
    setShowWin(false);
    stoppedReels.current = 0;

    // Animação de clique
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

      // Deduz aposta
      const deductionResult = await SQLiteService.createTransaction({
        userId: userId,
        type: "withdraw",
        amount: betAmount,
        description: `🎰 Aposta Cassino - R$ ${betAmount.toFixed(2)}`, // ← NOVA DESCRIÇÃO
        status: "completed",
      });

      if (!deductionResult.success) {
        throw new Error(deductionResult.error || 'Falha ao deduzir a aposta');
      }

      // Atualiza saldo local
      const updatedUserResult = await SQLiteService.getUserByEmail(userEmail);
      if (updatedUserResult.success && updatedUserResult.user) {
        const finalBalance = Number(updatedUserResult.user.balance) || 0;
        setBalance(finalBalance);
      } else {
        setBalance(balance - betAmount);
      }

      // Gera resultados
      const newResults = [
        getWeightedRandomSymbol(),
        getWeightedRandomSymbol(),
        getWeightedRandomSymbol()
      ];

      // Armazena dados da rotação atual
      spinData.current = {
        results: newResults,
        userId,
        betAmount
      };

      // Atualiza resultados (dispara animação)
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

  const PayoutItem = ({ symbol }: { symbol: SymbolType }) => {
    const SymbolComponent = symbol.component;
    let multiplier = '10x';
    if (symbol.weight <= 3) multiplier = '50x';
    else if (symbol.weight <= 5) multiplier = '25x';
    else if (symbol.weight <= 8) multiplier = '15x';

    return (
      <View style={styles.payoutItem}>
        <View style={[styles.payoutSymbol, { borderColor: symbol.color }]}>
          <SymbolComponent size={35} />
        </View>
        <View style={styles.payoutInfo}>
          <Text style={styles.payoutName}>{symbol.name}</Text>
          <Text style={styles.payoutMultiplier}>3x = {multiplier}</Text>
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
        <View style={styles.loadingDots}>
          <Animated.View style={styles.dot} />
          <Animated.View style={styles.dot} />
          <Animated.View style={styles.dot} />
        </View>
      </Animated.View>
    </View>
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0C0A1D" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFD700" />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Aposte Agora no Tigrinho</Text>
          <Animated.View style={[styles.glowLine, glowAnimatedStyle]} />
        </View>

        <View style={styles.rightHeaderContainer}>
          <TouchableOpacity
            style={styles.depositButton}
            onPress={() => router.push('(tabs)/deposit')}
          >
            <Ionicons name="add-circle" size={24} color="#0C0A1D" />
            <Text style={styles.depositButtonText}>DEPÓSITO</Text>
          </TouchableOpacity>

          <Animated.View style={[styles.balanceContainer, balanceAnimatedStyle]}>
            <Ionicons name="logo-bitcoin" size={20} color="#FFD700" />
            <Text style={styles.balanceText}>R$ {balance?.toFixed(2) || '0.00'}</Text>
          </Animated.View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Máquina Cassino */}
        <Animated.View style={[styles.machine, machineAnimatedStyle]}>
          {showWin && (
            <Animated.View style={[styles.winDisplay, winAnimatedStyle]}>
              <Text style={styles.winText}>+R$ {winAmount.toFixed(2)}</Text>
            </Animated.View>
          )}

          {/* Painel das Roletas */}
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
          </View>

          {/* Painel de Controle */}
          <View style={styles.controlPanel}>
            <View style={styles.betDisplay}>
              <Text style={styles.betLabel}>APOSTA ATUAL</Text>
              <TouchableOpacity
                onPress={() => setShowBetModal(true)}
                style={styles.betAmountButton}
              >
                <Text style={styles.betAmountText}>R$ {betAmount.toFixed(2)}</Text>
                <Ionicons name="pencil" size={16} color="#FFD700" />
              </TouchableOpacity>
            </View>

            <TouchableOpacityAnimated
              style={[
                styles.spinButton,
                (isSpinning || balance === null || balance < betAmount) && styles.spinButtonDisabled
              ]}
              onPress={spin}
              disabled={isSpinning || balance === null || balance < betAmount}
            >
              <Ionicons
                name={isSpinning ? "refresh" : "play"}
                size={32}
                color="#0C0A1D"
              />
              <Text style={styles.spinButtonText}>
                {isSpinning ? 'GIRANDO...' : 'GIRAR'}
              </Text>
            </TouchableOpacityAnimated>
          </View>
        </Animated.View>

        {/* Apostas Rápidas */}
        <View style={styles.quickBets}>
          <Text style={styles.quickBetsTitle}>APOSTA RÁPIDA</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[1, 5, 10, 25, 50, 100].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.quickBetButton,
                  betAmount === amount && styles.quickBetButtonActive,
                  (balance === null || balance < amount) && styles.quickBetButtonDisabled
                ]}
                onPress={() => setBetAmount(amount)}
                disabled={balance === null || balance < amount}
              >
                <Text style={[
                  styles.quickBetText,
                  betAmount === amount && styles.quickBetTextActive,
                  (balance === null || balance < amount) && styles.quickBetTextDisabled
                ]}>
                  R$ {amount}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tabela de Pagamentos */}
        <View style={styles.payouts}>
          <Text style={styles.payoutsTitle}>TABELA DE PAGAMENTOS</Text>
          <View style={styles.payoutsGrid}>
            {SYMBOLS.map((symbol) => (
              <PayoutItem key={symbol.id} symbol={symbol} />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Modal de Boas-Vindas (NOVO) */}
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
              <View style={styles.sparkleIcon}>
                <Ionicons name="sparkles" size={30} color="#FFD700" />
              </View>
            </View>

            <Text style={styles.welcomeTitle}>🎉 BEM-VINDO AO CASSINO! 🎉</Text>
            <Text style={styles.welcomeSubtitle}>Seu Universo de Diversão e Prêmios</Text>

            <View style={styles.welcomeFeatures}>
              <View style={styles.featureItem}>
                <Ionicons name="diamond" size={24} color="#FFD700" />
                <Text style={styles.featureText}>Jogos emocionantes</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="cash" size={24} color="#FFD700" />
                <Text style={styles.featureText}>Prêmios incríveis</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="shield-checkmark" size={24} color="#FFD700" />
                <Text style={styles.featureText}>Jogo seguro</Text>
              </View>
            </View>

            <View style={styles.welcomePointsContainer}>
              <Text style={styles.welcomePointsTitle}>PONTOS PARA TESTAR!</Text>
              <View style={styles.pointsDisplay}>
                <Ionicons name="logo-bitcoin" size={40} color="#FFD700" />
                <View>
                  <Text style={styles.pointsAmount}>R$ {balance?.toFixed(2) || '0.00'}</Text>
                  <Text style={styles.pointsDescription}>Saldo inicial para jogar</Text>
                </View>
              </View>
            </View>

            <Text style={styles.welcomeMessage}>
              Divirta-se com nossa máquina caça-níqueis!{'\n'}
              Experimente diferentes apostas e veja sua sorte!{'\n\n'}
              <Text style={styles.tipText}>💡 Dica: Comece com apostas baixas para se familiarizar!</Text>
            </Text>

            <TouchableOpacity
              style={styles.startPlayingButton}
              onPress={handleWelcomeClose}
              activeOpacity={0.8}
            >
              <Ionicons name="play-circle" size={28} color="#0C0A1D" />
              <Text style={styles.startPlayingButtonText}>COMEÇAR A JOGAR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.howToPlayButton}
              onPress={() => {
                handleWelcomeClose();
                Alert.alert('Como Jogar',
                  '1. Escolha o valor da aposta\n' +
                  '2. Clique em GIRAR\n' +
                  '3. Combine 3 símbolos iguais para ganhar\n' +
                  '4. 2 símbolos iguais também dão prêmio!\n\n' +
                  'Divirta-se e boa sorte! 🍀'
                );
              }}
            >
              <Text style={styles.howToPlayText}>Como jogar?</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal de Bônus de Boas-Vindas (EXISTENTE) */}
      <Modal
        visible={showWelcomeBonus}
        transparent
        animationType="fade"
        onRequestClose={claimWelcomeBonus}
      >
        <View style={styles.bonusModalOverlay}>
          <View style={styles.bonusModalContent}>
            <View style={styles.welcomeIcon}>
              <Ionicons name="gift" size={60} color="#FFD700" />
            </View>
            <Text style={styles.welcomeTitle}>🎉 BÔNUS ESPECIAL! 🎉</Text>
            <Text style={styles.welcomeSubtitle}>Presente de Boas-Vindas</Text>

            <View style={styles.bonusContainer}>
              <Ionicons name="logo-bitcoin" size={30} color="#FFD700" />
              <Text style={styles.bonusAmount}>+ R$ 30,00</Text>
            </View>

            <Text style={styles.welcomeMessage}>
              Parabéns! Você acaba de ganhar R$ 30,00 de bônus para começar a jogar!
              {"\n\n"}
              Seu saldo é agora de
              <Text style={styles.totalAmount}> R$ {(balance !== null ? balance : 0) + 30.00}</Text>
            </Text>

            <TouchableOpacity
              style={styles.claimButton}
              onPress={claimWelcomeBonus}
            >
              <Ionicons name="sparkles" size={24} color="#0C0A1D" />
              <Text style={styles.claimButtonText}>RESGATAR BÔNUS</Text>
            </TouchableOpacity>
          </View>
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

            <TextInput
              style={styles.betInput}
              placeholder={`R$ 1,00 - R$ ${balance?.toFixed(2) || '0.00'}`}
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
              value={customBet}
              onChangeText={setCustomBet}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setShowBetModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={handleCustomBet}
              >
                <Text style={styles.modalButtonTextConfirm}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ----------------------------------------------------
// 🎨 ESTILOS (ATUALIZADOS COM NOVOS ESTILOS)
// ----------------------------------------------------
const styles = StyleSheet.create({
  // ====================
  // ESTILOS GERAIS
  // ====================
  container: {
    flex: 1,
    backgroundColor: '#0C0A1D',
  },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 10,
  },

  // ====================
  // ESTILOS DE CARREGAMENTO (Loading) ⏳
  // ====================
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0C0A1D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingSkeleton: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#1A1636',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  loadingSpinner: {
    marginBottom: 20,
  },
  loadingText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFD700',
    marginHorizontal: 4,
    opacity: 0.6,
  },

  // ====================
  // ESTILOS DO CABEÇALHO (Header) 👑
  // ====================
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'rgba(12, 10, 29, 0.95)',
    borderBottomWidth: 3,
    borderBottomColor: '#FFD700',
    elevation: 15,
    zIndex: 100,
    position: 'relative',
  },
  headerShadow: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  backButton: {
    padding: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    width: 48,
    height: 48,
    elevation: 5,
  },
  backButtonShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 60,
    zIndex: 1,
  },
  titleContainerPointerEvents: {
    pointerEvents: 'none',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontFamily: 'System',
    textAlign: 'center',
    paddingHorizontal: 20,
    textShadow: '0px 0px 12px rgba(255, 215, 0, 0.6)',
  },
  glowLine: {
    width: 160,
    height: 5,
    backgroundColor: '#FFD700',
    marginTop: 8,
    borderRadius: 4,
    elevation: 8,
  },
  glowLineShadow: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
  },
  rightHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 2,
    marginLeft: 'auto',
  },
  depositButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: 'rgba(255, 215, 0, 0.9)',
    elevation: 8,
    gap: 8,
  },
  depositButtonShadow: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  depositButtonText: {
    color: '#0C0A1D',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(12, 10, 29, 0.95)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    minWidth: 130,
    elevation: 6,
    gap: 10,
  },
  balanceContainerShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  balanceText: {
    color: '#FFD700',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.8,
    textShadow: '0px 0px 6px rgba(255, 215, 0, 0.4)',
  },

  // ====================
  // ESTILOS DA MÁQUINA (Slot Machine) 🎰
  // ====================
  machine: {
    backgroundColor: '#1A1636',
    borderRadius: 24,
    padding: 28,
    marginBottom: 25,
    borderWidth: 4,
    borderColor: '#FFD700',
    elevation: 20,
    marginTop: 10,
    position: 'relative',
  },
  machineShadow: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 25,
  },
  reelsPanel: {
    backgroundColor: '#0C0A1D',
    borderRadius: 18,
    padding: 18,
    marginBottom: 25,
    borderWidth: 2.5,
    borderColor: '#FFD700',
  },
  reelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  reelContainer: {
    alignItems: 'center',
    position: 'relative',
    flex: 1,
  },
  reelWindow: {
    width: '100%',
    // Nota: 'REEL_WINDOW_HEIGHT' deve ser uma constante definida fora de 'styles'.
    height: REEL_WINDOW_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1636',
    position: 'relative',
  },
  reelContent: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  symbolWrapper: {
    // Nota: 'SYMBOL_HEIGHT' deve ser uma constante definida fora de 'styles'.
    height: SYMBOL_HEIGHT,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reelOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 12,
    borderWidth: 3,
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  reelIndicator: {
    position: 'absolute',
    width: '100%',
    height: 4,
    backgroundColor: '#FFD700',
    top: '50%',
    marginTop: -2,
    elevation: 8,
    zIndex: 3,
  },
  reelIndicatorShadow: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
  },
  winDisplay: {
    position: 'absolute',
    top: -25,
    alignSelf: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 24,
    zIndex: 10,
    elevation: 15,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  winDisplayShadow: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  winText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    textShadow: '0px 2px 4px rgba(0, 0, 0, 0.5)',
  },

  // ====================
  // ESTILOS DO PAINEL DE CONTROLE 🕹️
  // ====================
  controlPanel: {
    alignItems: 'center',
    marginTop: 10,
  },
  betDisplay: {
    alignItems: 'center',
    marginBottom: 25,
  },
  betLabel: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  betAmountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFD700',
    gap: 8,
  },
  betAmountText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  spinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    width: '80%',
    paddingVertical: 18,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: '#FFF8E1',
    elevation: 10,
    gap: 12,
  },
  spinButtonShadow: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 15,
  },
  spinButtonDisabled: {
    backgroundColor: '#383000',
    borderColor: '#666',
    elevation: 0,
  },
  spinButtonDisabledShadow: {
    shadowOpacity: 0.3,
  },
  spinButtonText: {
    color: '#0C0A1D',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  quickBets: {
    marginBottom: 25,
  },
  quickBetsTitle: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  quickBetButton: {
    backgroundColor: '#1A1636',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    minWidth: 80,
    alignItems: 'center',
  },
  quickBetButtonActive: {
    backgroundColor: '#FFD700',
    borderColor: '#FFFFFF',
  },
  quickBetButtonDisabled: {
    opacity: 0.4,
    borderColor: '#333',
  },
  quickBetText: {
    color: '#FFD700',
    fontWeight: '700',
    fontSize: 16,
  },
  quickBetTextActive: {
    color: '#0C0A1D',
    fontWeight: '900',
  },
  quickBetTextDisabled: {
    color: '#AAA',
  },

  // ====================
  // ESTILOS DA TABELA DE PAGAMENTOS (Payouts) 🏆
  // ====================
  payouts: {
    backgroundColor: '#1A1636',
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20,
  },
  payoutsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 10,
  },
  payoutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  payoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%', // Ajustado para 48% para dar espaço ao gap
    padding: 10,
    backgroundColor: '#0C0A1D',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700',
    marginBottom: 5,
  },
  payoutSymbol: {
    padding: 5,
    borderRadius: 8,
    borderWidth: 2,
    marginRight: 10,
  },
  payoutInfo: {
    flex: 1,
  },
  payoutName: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  payoutMultiplier: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // ====================
  // ESTILOS DO MODAL DE APOSTAS (Bet Modal) 💰
  // ====================
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    backgroundColor: '#1A1636',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderTopWidth: 5,
    borderTopColor: '#FFD700',
  },
  modalTitle: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  betInput: {
    width: '100%',
    backgroundColor: '#0C0A1D',
    color: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 15,
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: '#666',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonTextCancel: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalButtonConfirm: {
    flex: 1,
    backgroundColor: '#FFD700',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonTextConfirm: {
    color: '#0C0A1D',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // ====================
  // ESTILOS DO MODAL DE BOAS-VINDAS (Welcome Modal) 🎉
  // ====================
  welcomeModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    padding: 20,
  },
  welcomeModalContent: {
    backgroundColor: '#1A1636',
    borderRadius: 30,
    padding: 35,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#FFD700',
    elevation: 30,
  },
  welcomeModalContentShadow: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 30,
  },
  welcomeIconContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  sparkleIcon: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 20,
    padding: 5,
  },
  welcomeTitle: {
    color: '#FFD700',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1.2,
    textShadow: '0px 0px 15px rgba(255, 215, 0, 0.7)',
  },
  welcomeSubtitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 25,
  },
  welcomeFeatures: {
    width: '100%',
    marginBottom: 25,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  featureText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
  welcomePointsContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  welcomePointsTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 15,
    letterSpacing: 1,
  },
  pointsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsAmount: {
    color: '#FFD700',
    fontSize: 32,
    fontWeight: '900',
    marginLeft: 15,
  },
  pointsDescription: {
    color: '#CCCCCC',
    fontSize: 14,
    marginLeft: 15,
    marginTop: 4,
  },
  welcomeMessage: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  tipText: {
    color: '#FFD700',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  startPlayingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 25,
    elevation: 10,
    marginBottom: 15,
    gap: 10,
  },
  startPlayingButtonShadow: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  startPlayingButtonText: {
    color: '#0C0A1D',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  howToPlayButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  howToPlayText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // ====================
  // ESTILOS DO MODAL DE BÔNUS (Bonus Modal) 🎁
  // ====================
  bonusModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  bonusModalContent: {
    backgroundColor: '#1A1636',
    borderRadius: 20,
    padding: 35,
    margin: 20,
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#FFD700',
    elevation: 25,
  },
  bonusModalContentShadow: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  welcomeIcon: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  bonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    padding: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 10,
  },
  bonusAmount: {
    color: '#FFD700',
    fontSize: 30,
    fontWeight: '900',
    marginLeft: 10,
  },
  totalAmount: {
    fontWeight: 'bold',
    color: '#10B981',
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 8,
    gap: 10,
  },
  claimButtonShadow: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  claimButtonText: {
    color: '#0C0A1D',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});