import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function HomeScreen() {
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      const savedUser = await AsyncStorage.getItem("@loggedUser");
      setUser(savedUser);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem("@loggedUser");
    router.replace("/(auth)/login");
  };

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#60a5fa" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.navbar}>
        <Text style={styles.logo}>AsyncStorage</Text>

        <View style={styles.navLinks}>
          {["Home", "Projeto", "Código", "Contato", "Sobre"].map((item) => (
            <TouchableOpacity key={item}>
              <Text style={styles.navLink}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Perfil e menu */}
        <View>
          <TouchableOpacity
            style={styles.userSection}
            onPress={toggleMenu}
            activeOpacity={0.7}
          >
            <Image
              source={{
                uri: "https://cdn-icons-png.flaticon.com/512/847/847969.png",
              }}
              style={styles.avatar}
            />
            <Text style={styles.username}>{user || "Usuário"}</Text>
          </TouchableOpacity>

          <Modal
            transparent={true}
            visible={menuVisible}
            animationType="fade"
            onRequestClose={() => setMenuVisible(false)}
          >
            <TouchableOpacity
              style={styles.overlay}
              onPress={() => setMenuVisible(false)}
            >
              <View style={styles.dropdownMenu}>
                <TouchableOpacity style={styles.menuItem}>
                  <Text style={styles.menuText}>Perfil</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem}>
                  <Text style={styles.menuText}>Configurações</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                  <Text style={[styles.menuText, { color: "#ef4444" }]}>
                    Sair
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
      </View>

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.textContainer}>
          <Text style={styles.heroTitle}>AsyncStorage</Text>
          <Text style={styles.heroSubtitle}>
            Seja bem-vindo, <Text style={styles.usernameText}>{user}</Text>!{"\n"}
            O AsyncStorage é uma forma simples e persistente de armazenar dados no
            dispositivo. Ele permite salvar informações como login, preferências e
            configurações localmente, mesmo após fechar o app.
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Ler mais</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Ver exemplo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Imagem central AsyncStorage */}
        <View style={styles.imageContainer}>
          <Image
            source={require("../../assets/images/react-logo.png")}
            style={styles.heroImage}
          />
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2025
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
  flexGrow: 1,
  backgroundColor: "#07081A",
  paddingBottom: 40,
  justifyContent: "space-between", // adiciona isso
},
  // Loading
  loadingContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#60a5fa",
    marginTop: 10,
  },
  // Navbar
  navbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 50,
    paddingVertical: 20,
  },
  logo: {
    color: "#60a5fa",
    fontSize: 24,
    fontWeight: "700",
  },
  navLinks: {
    flexDirection: "row",
    gap: 30,
  },
  navLink: {
    color: "#cbd5e1",
    fontSize: 16,
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#475569",
  },
  username: {
    color: "#94a3b8",
    fontSize: 14,
  },
  // Menu flutuante
  overlay: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 70,
    paddingRight: 30,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  dropdownMenu: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingVertical: 8,
    width: 180,
    boxShadow: '0px 0px 8px rgba(0, 0, 0, 0.3)',
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  menuText: {
    color: "#e2e8f0",
    fontSize: 15,
  },

  // Hero
  heroSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 300,
    paddingTop: 70,
  },
  textContainer: {
    flex: 1,
    maxWidth: 4000,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 16,
    color: "#94a3b8",
    lineHeight: 24,
    marginBottom: 24,
  },
  usernameText: {
    color: "#60a5fa",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#60a5fa",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  secondaryButtonText: {
    color: "#60a5fa",
    fontWeight: "600",
    fontSize: 16,
  },

  imageContainer: {
    flex: 1,
    alignItems: "center",
  },
  heroImage: {
    width: 380,
    height: 300,
    resizeMode: "contain",
  },

  // Footer
footer: {
  alignItems: "center",
  justifyContent: "flex-end",
  paddingTop: 40,
  borderTopWidth: 1,
  borderTopColor: "#1e293b",
  marginHorizontal: 40,
  marginTop: 350, // empurra o footer mais para baixo
  paddingBottom: 20, // dá espaço da borda inferior
},
footerText: {
  color: "#94a3b8",
  fontSize: 12,
  marginBottom: 12,
},

});
