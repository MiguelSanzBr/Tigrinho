// components/Button.tsx
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
}

export default function Button({ 
  title, 
  onPress, 
  variant = 'primary', 
  loading = false, 
  disabled = false 
}: ButtonProps) {
  const baseClasses = "w-full py-3 rounded-lg flex items-center justify-center";
  
  const variants = {
    primary: "bg-blue-600 dark:bg-blue-500",
    secondary: "bg-gray-600 dark:bg-gray-500"
  };

  return (
    <TouchableOpacity
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${disabled || loading ? 'opacity-50' : ''}
      `}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <View className="flex items-center justify-center">
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-semibold text-base">
            {title}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}