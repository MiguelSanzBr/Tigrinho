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

export default function RegisterScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [sqliteInitialized, setSqliteInitialized] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  // ---------- 🌙 Persistência do modo escuro ----------
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
        console.log("✅ SQLite inicializado com sucesso");
      } catch (error) {
        console.error("❌ Erro ao inicializar SQLite:", error);
        Alert.alert("Erro", "Não foi possível inicializar o banco de dados");
      }
    };

    initializeSQLite();
  }, []);

  const validateForm = () => {
    const newErrors = {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    };

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }

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

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Confirme sua senha";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Senhas não coincidem";
    }

    setErrors(newErrors);
    return (
      !newErrors.name &&
      !newErrors.email &&
      !newErrors.password &&
      !newErrors.confirmPassword
    );
  };

  // Função para verificar se o email já existe
  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      console.log("🔍 Verificando se email já existe:", email);
      const result = await SQLiteService.getUserByEmail(email.trim());
      
      if (result.success && result.user) {
        console.log("❌ Email já cadastrado:", email);
        return true;
      }
      
      console.log("✅ Email disponível:", email);
      return false;
    } catch (error) {
      console.error("Erro ao verificar email:", error);
      return false;
    }
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    if (!sqliteInitialized) {
      Alert.alert("Aguarde", "Banco de dados está sendo inicializado...");
      return;
    }

    setLoading(true);

    try {
      console.log("📝 Tentando cadastrar usuário:", formData.email);
      
      // ✅ PRIMEIRO verificar se o email já existe
      const emailExists = await checkEmailExists(formData.email);
      
      if (emailExists) {
        Alert.alert(
          "Email já cadastrado",
          "Este email já está em uso. Por favor, use outro email ou faça login."
        );
        setLoading(false);
        return;
      }

      // ✅ Se email não existe, prosseguir com o cadastro
      const result = await SQLiteService.saveUser({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      console.log("✅ Resultado do cadastro:", result);

      if (result.success) {
       router.push("/login");
        Alert.alert(
          "Sucesso!",
          `Conta criada com sucesso!\n\nTempo de execução: ${result.time.toFixed(2)}ms`,
          [
            {
              text: "OK",
              onPress: () => {
                // Limpar formulário
                setFormData({
                  name: "",
                  email: "",
                  password: "",
                  confirmPassword: "",
                });
                
                // Navegar para login
                console.log("🔄 Navegando para login...");
                router.push("/(auth)/login");
              },
            },
          ]
        );
      } else {
        // Tratar outros erros do cadastro
        Alert.alert(
          "Erro no cadastro",
          result.error || "Falha no registro. Tente novamente."
        );
      }
    } catch (error: any) {
      console.error("❌ Erro no registro:", error);
      Alert.alert("Erro", error.message || "Falha no registro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  // Se o tema ou SQLite ainda não foram inicializados, mostra loading
  if (!isThemeLoaded || !sqliteInitialized) {
    return (
      <View style={[styles.gradient, { 
        backgroundColor: isDarkMode ? "#0f0b1a" : "#f1f5f9", 
        justifyContent: 'center', 
        alignItems: 'center' 
      }]}>
        <ActivityIndicator size="large" color={isDarkMode ? "#ffffff" : "#2563eb"} />
        <Text style={{ 
          color: isDarkMode ? '#ffffff' : '#111827', 
          marginTop: 10 
        }}>
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
                Criar conta
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Preencha os dados para cadastrar
              </Text>
            </View>

            {["name", "email", "password", "confirmPassword"].map(
              (field, idx) => (
                <View key={idx} style={styles.inputContainer}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>
                    {field === "name"
                      ? "Nome completo"
                      : field === "email"
                      ? "Email"
                      : field === "password"
                      ? "Senha"
                      : "Confirmar senha"}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.inputBorder,
                        color: theme.textPrimary,
                      },
                      errors[field as keyof typeof errors] && styles.inputError,
                    ]}
                    placeholder={
                      field === "name"
                        ? "Seu nome"
                        : field === "email"
                        ? "seu@email.com"
                        : field === "password"
                        ? "Sua senha"
                        : "Confirme sua senha"
                    }
                    placeholderTextColor={theme.placeholder}
                    value={formData[field as keyof typeof formData]}
                    onChangeText={(text) =>
                      setFormData({ ...formData, [field]: text })
                    }
                    autoCapitalize={field === "email" ? "none" : "words"}
                    secureTextEntry={
                      field === "password" || field === "confirmPassword"
                    }
                  />
                  {errors[field as keyof typeof errors] ? (
                    <Text style={styles.errorText}>
                      {errors[field as keyof typeof errors]}
                    </Text>
                  ) : null}
                </View>
              )
            )}

            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.primaryButton,
                  { backgroundColor: theme.buttonBg },
                  (loading || !sqliteInitialized) && styles.buttonDisabled,
                ]}
                onPress={handleRegister}
                disabled={loading || !sqliteInitialized}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>
                    Cadastrar
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                Já tem uma conta?{" "}
              </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={[styles.footerLink, { color: theme.link }]}>
                    Fazer login
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

// ---------- Temas ----------
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

// ---------- Estilos ----------
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
  header: { alignItems: "center", marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 15, textAlign: 'center' },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 14, marginBottom: 6 },
  input: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 16,
  },
  inputError: { borderColor: "#ef4444" },
  errorText: { color: "#ef4444", fontSize: 12, marginTop: 4 },
  buttonsContainer: { gap: 10 },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButton: {},
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  footerText: { fontSize: 14 },
  footerLink: { fontWeight: "600" },
});