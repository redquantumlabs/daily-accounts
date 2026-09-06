export interface BankStyle {
  colors: string[] | null;
  icon: {
    type: 'icon' | 'image';
    source: any;
  };
}

export const getBankStyle = (accountName: string, defaultColor: string): BankStyle => {
  const name = accountName.toLowerCase();

  // HDFC Bank
  if (name.includes('hdfc')) {
    return {
      colors: ['#004C8F', '#002E5D', '#E21836'], // HDFC Blue to Dark Blue to Red accent
      icon: {
        type: 'image',
        source: require('../../assets/other/HDB-bb6241fe.png'),
      },
    };
  }

  // Add more banks here in the future

  // Default configuration
  return {
    colors: null, // Will fallback to default gradient based on defaultColor
    icon: {
      type: 'icon',
      source: 'card', // Ionicons name
    },
  };
};
