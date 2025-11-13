import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link, useRouter } from "expo-router";
import { SQLiteService } from "../../services/SQLiteService";

export default function LoginScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [sqliteInitialized, setSqliteInitialized] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  // Verificar usuário logado
  useEffect(() => {
    const checkLoggedUser = async () => {
      try {
        const loggedUser = await AsyncStorage.getItem("@loggedUser");
        if (loggedUser) {
          router.replace("/Homescreen");
        }
      } catch (error) {
        console.error("Erro ao verificar usuário logado:", error);
      }
    };
    checkLoggedUser();
  }, []);

  // Carregar tema
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("@themeMode");
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === "dark");
        }
      } catch (error) {
        console.error("Erro ao carregar tema:", error);
      } finally {
        setIsThemeLoaded(true);
      }
    };
    loadTheme();
  }, []);

  // Salvar tema
  useEffect(() => {
    if (isThemeLoaded) {
      AsyncStorage.setItem("@themeMode", isDarkMode ? "dark" : "light").catch(
        (err) => console.error("Erro ao salvar tema:", err)
      );
    }
  }, [isDarkMode, isThemeLoaded]);

  // Inicializar SQLite
  useEffect(() => {
    const initializeSQLite = async () => {
      try {
        await SQLiteService.init();
        setSqliteInitialized(true);
        console.log("✅ SQLite inicializado com sucesso para login");
      } catch (error) {
        console.error("❌ Erro ao inicializar SQLite:", error);
        Alert.alert("Erro", "Não foi possível inicializar o banco de dados");
      }
    };

    initializeSQLite();
  }, []);

  const validateForm = () => {
    const newErrors = {
      email: "",
      password: "",
    };

    if (!formData.email.trim()) {
      newErrors.email = "Email é obrigatório";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }

    if (!formData.password) {
      newErrors.password = "Senha é obrigatória";
    } else if (formData.password.length < 6) {
      newErrors.password = "Senha deve ter pelo menos 6 caracteres";
    }

    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    if (!sqliteInitialized) {
      Alert.alert("Aguarde", "Banco de dados está sendo inicializado...");
      return;
    }

    setLoading(true);

    try {
      console.log("🔍 Buscando usuário no SQLite:", formData.email);
      
      const result = await SQLiteService.getUserByEmail(formData.email.trim());

      console.log("📊 Resultado da busca:", result);

      if (result.success && result.user) {
        console.log("👤 Usuário encontrado:", result.user.email);
        console.log("🔑 Verificando senha...");

        if (result.user.password === formData.password) {
          console.log("✅ Login bem-sucedido!");

          try {
            await AsyncStorage.setItem(
              "@loggedUser",
              result.user.name || result.user.email
            );
          } catch (err) {
            console.error("Erro ao salvar usuário logado:", err);
          }
          
          Alert.alert(
            "Sucesso!",
            `Login realizado com sucesso usando SQLite!\n\nTempo de busca: ${result.time.toFixed(2)}ms`,
            [
              {
                text: "OK",
                onPress: () => {
                  setFormData({ email: "", password: "" });
                  router.replace("/Homescreen");
                },
              },
            ]
          );
        } else {
          console.log("❌ Senha incorreta");
          Alert.alert("Erro", "Senha incorreta. Tente novamente.");
        }
      } else {
        console.log("❌ Usuário não encontrado:", result.error);
        Alert.alert(
          "Erro",
          result.error || "Usuário não encontrado. Verifique seu email."
        );
      }
    } catch (error) {
      console.error("💥 Erro no login:", error);
      Alert.alert("Erro", "Falha no login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  if (!isThemeLoaded || !sqliteInitialized) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0f0b1a",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#93c5fd" />
        <Text style={{ color: '#ffffff', marginTop: 10 }}>
          {!sqliteInitialized ? "Inicializando banco de dados..." : "Carregando..."}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.gradient, { backgroundColor: theme.background }]}>
      {/* Botão modo escuro/claro */}
      <TouchableOpacity
        style={styles.themeButton}
        onPress={() => setIsDarkMode(!isDarkMode)}
      >
        <Text style={{ fontSize: 20 }}>{isDarkMode ? "☀️" : "🌙"}</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.header}>
              <Image
                source={{
                  uri: "https://cdn-icons-png.flaticon.com/512/847/847969.png",
                }}
                style={styles.avatar}
              />
              <Text style={[styles.title, { color: theme.textPrimary }]}>
                Bem-vindo de volta
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Faça login na sua conta
              </Text>
            </View>

            {/* Input Email */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Email
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                    color: theme.textPrimary,
                  },
                  errors.email && styles.inputError,
                ]}
                placeholder="seu@email.com"
                placeholderTextColor={theme.placeholder}
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}
            </View>

            {/* Input Senha */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Senha
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                    color: theme.textPrimary,
                  },
                  errors.password && styles.inputError,
                ]}
                placeholder="Sua senha"
                placeholderTextColor={theme.placeholder}
                value={formData.password}
                onChangeText={(text) =>
                  setFormData({ ...formData, password: text })
                }
                secureTextEntry
              />
              {errors.password ? (
                <Text style={styles.errorText}>{errors.password}</Text>
              ) : null}
            </View>

            {/* Botão Esqueci Senha */}
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={[styles.linkText, { color: theme.link }]}>
                Esqueceu sua senha?
              </Text>
            </TouchableOpacity>

            {/* Botão Login */}
            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.primaryButton,
                  { backgroundColor: theme.buttonBg },
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>
                    Entrar com SQLite
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Link para Cadastro */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                Não tem uma conta?{" "}
              </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text style={[styles.footerLink, { color: theme.link }]}>
                    Cadastre-se
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Temas
const darkTheme = {
  background: "#0f0b1a",
  card: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.1)",
  textPrimary: "#ffffff",
  textSecondary: "#cbd5e1",
  inputBg: "rgba(255,255,255,0.05)",
  inputBorder: "rgba(255,255,255,0.2)",
  placeholder: "#94a3b8",
  link: "#93c5fd",
  buttonBg: "rgba(59,130,246,0.6)",
  buttonBorder: "#2563eb",
};

const lightTheme = {
  background: "#f1f5f9",
  card: "#ffffff",
  border: "#e2e8f0",
  textPrimary: "#111827",
  textSecondary: "#475569",
  inputBg: "#f8fafc",
  inputBorder: "#cbd5e1",
  placeholder: "#94a3b8",
  link: "#2563eb",
  buttonBg: "#2563eb",
  buttonBorder: "#2563eb",
};

// Estilos
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  themeButton: {
    position: "absolute",
    top: 50,
    right: 30,
    zIndex: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    padding: 6,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 80,
  },
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    elevation: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: { fontSize: 14, marginBottom: 6 },
  input: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 16,
  },
  linkText: {
    fontWeight: "500",
  },
  buttonsContainer: {
    gap: 10,
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButton: {},
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontWeight: "600",
  },
});