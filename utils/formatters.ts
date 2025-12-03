export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};
export const formatDate = (dateValue: string | number): string => {
  let date: Date;

  if (typeof dateValue === 'number') {
    // Se for number, assume que é um timestamp (em milissegundos)
    // Se seus timestamps estiverem em SEGUNDOS, use 'date = new Date(dateValue * 1000);'
    date = new Date(dateValue);
  } else {
    // Se for string, tenta criar a data a partir da string
    date = new Date(dateValue);
  }

  // Verifica se a data é válida
  if (isNaN(date.getTime())) {
    return 'Data Inválida';
  }

  // Define as opções de formatação (ex: dd/mm/aaaa hh:mm)
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false, // Formato 24h
  };

  // Retorna a data formatada no locale português do Brasil
  return date.toLocaleDateString('pt-BR', options);
};

// Função para formatar o valor do TextInput para moeda
export const formatInputToCurrency = (value: string): string => {
  if (!value) return "";
  
  // Remove tudo que não for dígito
  let cleaned = value.replace(/[^\d]/g, '');
  
  // Se não tiver dígitos, retorna vazio
  if (cleaned.length === 0) return "";
  
  // Converte para número e divide por 100 para ter os centavos
  let amount = parseInt(cleaned, 10);
  
  // Formata como moeda brasileira
  let formatted = (amount / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return formatted;
};

// Função para converter valor formatado de volta para número
export const parseCurrencyToNumber = (formattedValue: string): number => {
  if (!formattedValue) return 0;
  
  // Remove R$, pontos e substitui vírgula por ponto
  const cleanValue = formattedValue
    .replace('R$', '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  
  return parseFloat(cleanValue) || 0;
};