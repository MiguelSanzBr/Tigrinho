import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React from "react"; // Importar React é uma boa prática em JSX/TSX

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "#0f0b1a", // Cor de fundo escura do tema
          borderTopColor: "rgba(255,255,255,0.1)", // Linha superior discreta
          height: 70, // Altura um pouco maior para melhor toque
          paddingVertical: 10,
        },
        tabBarActiveTintColor: "#FFD700", // Dourado do cassino como cor ativa
        tabBarInactiveTintColor: "#94a3b8", // Cinza claro como cor inativa
        headerShown: false, // Esconder o header padrão do Expo Router
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 5,
        }
      }}
    >
      
      {/* Rota para o Depósito */}
      <Tabs.Screen
        name="deposit"
        options={{
          title: "Depósito",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: "Cassino",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="dice" size={size} color={color} />
          ),
        }}
      />
      
      {/* Rota para o Perfil (Sugestão para gerenciamento de conta) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" size={size} color={color} />
          ),
        }}
      />

      
    </Tabs>
  );
}