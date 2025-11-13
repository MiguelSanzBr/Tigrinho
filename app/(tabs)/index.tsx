// app/index.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header com gradiente */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="rocket" size={60} color="#fff" />
          <Text style={styles.title}>Bem-vindo</Text>
          <Text style={styles.subtitle}>Sua jornada começa aqui</Text>
        </View>
      </View>

      {/* Conteúdo principal */}
      <View style={styles.content}>
        <Text style={styles.welcomeText}>
          Junte-se a nós e descubra um mundo de possibilidades
        </Text>

        {/* Botão de Login */}
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => router.push('/(auth)/login')}
        >
          <Ionicons name="log-in" size={24} color="#fff" />
          <Text style={styles.buttonText}>Fazer Login</Text>
        </TouchableOpacity>

        {/* Botão de Registro */}
        <TouchableOpacity 
          style={styles.registerButton}
          onPress={() => router.push('/(auth)/register')}
        >
          <Ionicons name="person-add" size={24} color="#667eea" />
          <Text style={styles.registerButtonText}>Criar Conta</Text>
        </TouchableOpacity>

        {/* Links rápidos */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Ao continuar, você concorda com nossos{' '}
            <Text style={styles.link}>Termos de Serviço</Text> e{' '}
            <Text style={styles.link}>Política de Privacidade</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 300,
    backgroundColor: '#667eea',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#4a5568',
    marginBottom: 40,
    lineHeight: 24,
  },
  loginButton: {
    backgroundColor: '#667eea',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    boxShadow: '0px 4px 8px rgba(102, 126, 234, 0.3)',
    elevation: 5,
  },
  registerButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#667eea',
    marginBottom: 32,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  registerButtonText: {
    color: '#667eea',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
  footerText: {
    textAlign: 'center',
    color: '#718096',
    fontSize: 12,
    lineHeight: 16,
  },
  link: {
    color: '#667eea',
    fontWeight: '500',
  },
});