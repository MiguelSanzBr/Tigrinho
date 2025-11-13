// components/Input.tsx
import React from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

export default function Input({ label, error, ...props }: InputProps) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </Text>
      <TextInput
        className={`
          w-full px-4 py-3 border rounded-lg
          bg-white dark:bg-gray-800
          border-gray-300 dark:border-gray-600
          text-gray-900 dark:text-white
          focus:border-blue-500 dark:focus:border-blue-400
          ${error ? 'border-red-500 dark:border-red-400' : ''}
        `}
        placeholderTextColor="#9CA3AF"
        {...props}
      />
      {error && (
        <Text className="text-red-500 dark:text-red-400 text-xs mt-1">
          {error}
        </Text>
      )}
    </View>
  );
}