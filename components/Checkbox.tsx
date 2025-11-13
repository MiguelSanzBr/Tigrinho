import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, useColorScheme, Animated } from 'react-native';

interface CheckboxProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  description?: string;
  disabled?: boolean;
}

export default function Checkbox({ label, value, onValueChange, description }: CheckboxProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Usando useRef para as animações
  const labelColorAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animação de cor quando o checkbox é marcado
    Animated.timing(labelColorAnim, {
      toValue: value ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();

    // Animação de escala sutil (sem useNativeDriver para evitar warning)
    if (value) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.02,
          duration: 100,
          useNativeDriver: false,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [value]);

  // Interpolação da cor - do cinza com borda preta para o azul vibrante
  const labelColor = labelColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [isDark ? '#9ca3af' : '#6b7280', '#3b82f6'] // Cinza escuro → Azul vibrante
  });

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => onValueChange(!value)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.checkbox, 
        { 
          borderColor: value ? '#3b82f6' : (isDark ? '#000000' : '#374151'),
          backgroundColor: value 
            ? '#3b82f6' 
            : isDark ? '#4b5563' : '#f3f4f6', // Cinza para fundo quando não selecionado
          borderWidth: value ? 2 : 1.5,
        }
      ]}>
        {value && <View style={styles.checkboxInner} />}
      </View>
      <View style={styles.textContainer}>
        <Animated.Text 
          style={[
            styles.label,
            { 
              color: labelColor,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {label}
        </Animated.Text>
        {description && (
          <Text style={[
            styles.description,
            { color: isDark ? '#d1d5db' : '#6b7280' }
          ]}>
            {description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 10,
    height: 10,
    backgroundColor: 'white',
    borderRadius: 2,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 18,
  },
});