// app/(tabs)/cassino.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  ScrollView,
  Dimensions,
  TextInput,
  Modal,
  StatusBar
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
  runOnJS
} from 'react-native-reanimated';
import { SYMBOLS, SymbolType } from '../../components/CasinoIcons';

const TouchableOpacityAnimated = Animated.createAnimatedComponent(TouchableOpacity);
const { width } = Dimensions.get('window');

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

  // Animações Reanimated
  const machineScale = useSharedValue(1);
  const reelPositions = [
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0)
  ];
  const reelBlur = [
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0)
  ];
  const winPulse = useSharedValue(0);
  const glowOpacity = useSharedValue(0.3);
  const balanceAnimation = useSharedValue(0);
  const loadingProgress = useSharedValue(0);

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
    const interval = setInterval(animateGlow, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadBalance = async () => {
    try {
      setIsLoading(true);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const userBalance = await AsyncStorage.getItem('userBalance');
      const bonusClaimed = await AsyncStorage.getItem('bonusClaimed');
      
      if (userBalance) {
        const balanceValue = parseFloat(userBalance);
        setBalance(balanceValue);
        
        balanceAnimation.value = withTiming(1, { 
          duration: 1000, 
          easing: Easing.out(Easing.cubic) 
        });

        if (!bonusClaimed) {
          setTimeout(() => {
            setShowWelcomeBonus(true);
          }, 500);
        }
      } else {
        const initialBalance = 20;
        await AsyncStorage.setItem('userBalance', initialBalance.toString());
        setBalance(initialBalance);
        
        balanceAnimation.value = withTiming(1, { 
          duration: 1000, 
          easing: Easing.out(Easing.cubic) 
        });

        setTimeout(() => {
          setShowWelcomeBonus(true);
        }, 500);
      }
    } catch (error) {
      console.error('Erro ao carregar saldo:', error);
      setBalance(0);
    } finally {
      setIsLoading(false);
    }
  };

  const updateBalanceWithAnimation = async (newBalance: number) => {
    const currentBalance = balance || 0;
    const difference = newBalance - currentBalance;
    
    balanceAnimation.value = 0;
    
    await new Promise(resolve => {
      balanceAnimation.value = withTiming(1, { 
        duration: 1500, 
        easing: Easing.out(Easing.cubic) 
      }, () => {
        resolve(null);
      });
    });
    
    setBalance(newBalance);
    await AsyncStorage.setItem('userBalance', newBalance.toString());
  };

  const claimWelcomeBonus = async () => {
    try {
      const bonusClaimed = await AsyncStorage.getItem('bonusClaimed');
      if (!bonusClaimed && balance !== null) {
        const newBalance = balance + 30;
        await updateBalanceWithAnimation(newBalance);
        await AsyncStorage.setItem('bonusClaimed', 'true');
        setShowWelcomeBonus(false);
        
        setTimeout(() => {
          Alert.alert(
            '🎉 Bônus Ativado!', 
            'Parabéns! Você ganhou R$ 30,00 de bônus! Agora você tem R$ 50,00 para começar a jogar!'
          );
        }, 500);
      }
    } catch (error) {
      console.error('Erro ao ativar bônus:', error);
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

  const spin = async () => {
    if (isSpinning || balance === null || balance < betAmount) return;

    setIsSpinning(true);
    setWinAmount(0);
    setShowWin(false);

    // Animação de clique
    machineScale.value = withSequence(
      withSpring(0.95),
      withSpring(1)
    );

    // Deduz aposta com animação
    const newBalanceAfterBet = balance - betAmount;
    await updateBalanceWithAnimation(newBalanceAfterBet);

    // Gera resultados
    const newResults = [
      getWeightedRandomSymbol(),
      getWeightedRandomSymbol(),
      getWeightedRandomSymbol()
    ];

    // RESET E PREPARAÇÃO PARA ANIMAÇÃO
    reelPositions.forEach((position, index) => {
      position.value = 0;
      reelBlur[index].value = 0;
    });

    // FASE 1: ROTAÇÃO RÁPIDA COM DESFOQUE
    reelPositions.forEach((position, index) => {
      // Aplica desfoque imediatamente
      reelBlur[index].value = withTiming(8, {
        duration: 200,
        easing: Easing.out(Easing.cubic)
      });

      // Rola rapidamente para baixo (mais rápido que antes)
      position.value = withSequence(
        withTiming(-1200, {
          duration: 800 + index * 100, // Mais rápido
          easing: Easing.out(Easing.cubic)
        }),
        withDelay(index * 200, 
          withTiming(-600, {
            duration: 400, // Mais rápido
            easing: Easing.out(Easing.cubic)
          })
        )
      );
    });

    // FASE 2: DESACELERAÇÃO PROGRESSIVA
    setTimeout(() => {
      reelPositions.forEach((position, index) => {
        position.value = withSequence(
          withTiming(-300, {
            duration: 600 + index * 100,
            easing: Easing.out(Easing.cubic)
          }),
          withDelay(index * 150,
            withTiming(0, {
              duration: 300, // Final mais suave
              easing: Easing.out(Easing.cubic)
            })
          )
        );
      });
    }, 1200);

    // FASE 3: REMOÇÃO DO DESFOQUE QUANDO PARAR
    setTimeout(() => {
      reelBlur.forEach((blur, index) => {
        blur.value = withDelay(
          index * 100,
          withTiming(0, {
            duration: 300,
            easing: Easing.out(Easing.cubic)
          })
        );
      });
    }, 2000);

    // ATUALIZA RESULTADOS E VERIFICA VITÓRIA
    setTimeout(() => {
      setResults(newResults);
      setTimeout(() => {
        checkWin(newResults);
      }, 500);
    }, 2500);

    setTimeout(() => {
      setIsSpinning(false);
    }, 3000);
  };

  const checkWin = (spinResults: SymbolType[]) => {
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

    const winValue = betAmount * multiplier;
    
    if (winValue > 0 && balance !== null) {
      setWinAmount(winValue);
      const finalBalance = balance - betAmount + winValue;
      updateBalanceWithAnimation(finalBalance);
      
      winPulse.value = withSequence(
        withSpring(1),
        withDelay(2000, withSpring(0))
      );

      setShowWin(true);

      setTimeout(() => {
        Alert.alert('🎊 Parabéns!', `${winMessage}\nVocê ganhou R$ ${winValue.toFixed(2)}!`);
      }, 1500);
    } else {
      setTimeout(() => {
        Alert.alert('😢 Tente Novamente', 'Não foi desta vez! Continue tentando!');
      }, 1000);
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

  const reelAnimatedStyles = reelPositions.map((position, index) =>
    useAnimatedStyle(() => ({
      transform: [{ translateY: position.value }],
      filter: `blur(${reelBlur[index].value}px)`
    }))
  );

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

  const Reel = ({ symbol, index }: { symbol: SymbolType; index: number }) => {
    const SymbolComponent = symbol.component;
    
    return (
      <View style={styles.reelContainer}>
        <View style={styles.reelWindow}>
          <Animated.View style={[styles.reelContent, reelAnimatedStyles[index]]}>
            {/* Múltiplos símbolos para criar efeito de rolagem contínua */}
            <View style={styles.symbolWrapper}>
              <SymbolComponent size={70} />
            </View>
            <View style={styles.symbolWrapper}>
              <SymbolComponent size={70} />
            </View>
            <View style={styles.symbolWrapper}>
              <SymbolComponent size={70} />
            </View>
            <View style={styles.symbolWrapper}>
              <SymbolComponent size={70} />
            </View>
          </Animated.View>
        </View>
        <View style={[styles.reelOverlay, { borderColor: symbol.color }]} />
        {/* Indicador central */}
        <View style={styles.reelIndicator} />
      </View>
    );
  };

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

  // Componente de Loading
  const LoadingSkeleton = () => (
    <View style={styles.loadingContainer}>
      <Animated.View style={[styles.loadingSkeleton, loadingAnimatedStyle]}>
        <View style={styles.loadingSpinner}>
          <Ionicons name="diamond" size={30} color="#FFD700" />
        </View>
        <Text style={styles.loadingText}>Carregando Cassino...</Text>
        <View style={styles.loadingDots}>
          <Animated.View style={[styles.dot, { animationDelay: '0s' }]} />
          <Animated.View style={[styles.dot, { animationDelay: '0.2s' }]} />
          <Animated.View style={[styles.dot, { animationDelay: '0.4s' }]} />
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
          <Text style={styles.title}>SLOT MACHINE</Text>
          <Animated.View style={[styles.glowLine, glowAnimatedStyle]} />
        </View>

        <Animated.View style={[styles.balanceContainer, balanceAnimatedStyle]}>
          <Ionicons name="logo-bitcoin" size={20} color="#FFD700" />
          <Text style={styles.balanceText}>R$ {balance?.toFixed(2) || '0.00'}</Text>
        </Animated.View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Máquina Cassino */}
        <Animated.View style={[styles.machine, machineAnimatedStyle]}>
          {/* Display de Vitória */}
          {showWin && (
            <Animated.View style={[styles.winDisplay, winAnimatedStyle]}>
              <Text style={styles.winText}>+R$ {winAmount.toFixed(2)}</Text>
            </Animated.View>
          )}

          {/* Painel das Roletas */}
          <View style={styles.reelsPanel}>
            <View style={styles.reelsContainer}>
              {results.map((symbol, index) => (
                <Reel key={index} symbol={symbol} index={index} />
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

      {/* Modal de Boas-Vindas com Bônus */}
      <Modal
        visible={showWelcomeBonus}
        transparent
        animationType="fade"
        onRequestClose={claimWelcomeBonus}
      >
        <View style={styles.welcomeModalOverlay}>
          <View style={styles.welcomeModalContent}>
            <View style={styles.welcomeIcon}>
              <Ionicons name="gift" size={60} color="#FFD700" />
            </View>
            <Text style={styles.welcomeTitle}>🎉 BEM-VINDO! 🎉</Text>
            <Text style={styles.welcomeSubtitle}>Presente de Boas-Vindas</Text>
            
            <View style={styles.bonusContainer}>
              <Ionicons name="logo-bitcoin" size={30} color="#FFD700" />
              <Text style={styles.bonusAmount}>+ R$ 30,00</Text>
            </View>
            
            <Text style={styles.welcomeMessage}>
              Parabéns! Você acaba de ganhar R$ 30,00 de bônus para começar a jogar!
              {"\n\n"}
              Seu saldo inicial de R$ 20,00 + R$ 30,00 de bônus = 
              <Text style={styles.totalAmount}> R$ 50,00</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0A1D',
  },
  // Loading Styles
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#1A1636',
    borderBottomWidth: 2,
    borderBottomColor: '#FFD700',
  },
  backButton: {
    padding: 8,
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: 3,
  },
  glowLine: {
    width: 100,
    height: 3,
    backgroundColor: '#FFD700',
    marginTop: 5,
    borderRadius: 2,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  balanceText: {
    color: '#FFD700',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 16,
  },
  content: {
    flexGrow: 1,
    padding: 20,
  },
  machine: {
    backgroundColor: '#1A1636',
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    borderWidth: 4,
    borderColor: '#FFD700',
    elevation: 15,
  },
  reelsPanel: {
    backgroundColor: '#0C0A1D',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  reelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reelContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  reelWindow: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1A1636',
  },
  reelContent: {
    alignItems: 'center',
  },
  symbolWrapper: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reelOverlay: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 3,
    backgroundColor: 'transparent',
    pointerEvents: 'none',
  },
  reelIndicator: {
    position: 'absolute',
    width: '100%',
    height: 3,
    backgroundColor: '#FFD700',
    top: '50%',
    marginTop: -1.5,
    elevation: 5,
  },
  winDisplay: {
    position: 'absolute',
    top: -20,
    alignSelf: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 10,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  winText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  controlPanel: {
    alignItems: 'center',
  },
  betDisplay: {
    alignItems: 'center',
    marginBottom: 20,
  },
  betLabel: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  betAmountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  betAmountText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  spinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 45,
    paddingVertical: 18,
    borderRadius: 30,
    elevation: 8,
  },
  spinButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  spinButtonText: {
    color: '#0C0A1D',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 1,
  },
  quickBets: {
    backgroundColor: '#1A1636',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  quickBetsTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    letterSpacing: 1,
    textAlign: 'center',
  },
  quickBetButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  quickBetButtonActive: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  quickBetButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    opacity: 0.4,
  },
  quickBetText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  quickBetTextActive: {
    color: '#0C0A1D',
    fontWeight: 'bold',
  },
  quickBetTextDisabled: {
    color: '#666',
  },
  payouts: {
    backgroundColor: '#1A1636',
    borderRadius: 15,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  payoutsTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
    letterSpacing: 1,
    textAlign: 'center',
  },
  payoutsGrid: {
    // Remove flexDirection row para layout em coluna
  },
  payoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  payoutSymbol: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 2,
    backgroundColor: '#0C0A1D',
  },
  payoutInfo: {
    flex: 1,
  },
  payoutName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  payoutMultiplier: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '500',
  },
  // Modal de Boas-Vindas
  welcomeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcomeModalContent: {
    backgroundColor: '#1A1636',
    borderRadius: 25,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFD700',
    elevation: 20,
  },
  welcomeIcon: {
    marginBottom: 20,
  },
  welcomeTitle: {
    color: '#FFD700',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeSubtitle: {
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 25,
  },
  bonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.1)',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 15,
    marginBottom: 25,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  bonusAmount: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  welcomeMessage: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  totalAmount: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 18,
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 8,
  },
  claimButtonText: {
    color: '#0C0A1D',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  // Modal de Aposta
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1636',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    borderWidth: 3,
    borderColor: '#FFD700',
    elevation: 20,
  },
  modalTitle: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'center',
  },
  betInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 18,
    color: '#FFFFFF',
    fontSize: 18,
    marginBottom: 25,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 12,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#666',
  },
  modalButtonConfirm: {
    flex: 1,
    backgroundColor: '#FFD700',
    padding: 16,
    borderRadius: 12,
    marginLeft: 10,
    alignItems: 'center',
  },
  modalButtonTextCancel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  modalButtonTextConfirm: {
    color: '#0C0A1D',
    fontWeight: 'bold',
    fontSize: 16,
  },
});