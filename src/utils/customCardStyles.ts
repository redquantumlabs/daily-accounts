export interface CustomCardStyle {
  colors: string[] | null;
  icon: {
    type: 'icon' | 'image';
    source: any;
  };
}

export const getCustomCardStyle = (accountName: string, defaultColor: string): CustomCardStyle => {
  const name = accountName.toLowerCase();

  // HDFC Bank
  if (name.includes('hdfc')) {
    return {
      colors: ['#004C8F', '#002E5D', '#E21836'], // HDFC Blue to Dark Blue to Red accent
      icon: {
        type: 'image',
        source: require('../../assets/other/hdfc.png'),
      },
    };
  }

  // Canara Bank
  if (name.includes('canara')) {
    return {
      colors: ['#0F4C81', '#1D5A96', '#F68B1F'], // Canara Blue to Orange accent
      icon: {
        type: 'image',
        source: require('../../assets/other/canara.png'),
      },
    };
  }

  // SBI Bank
  if (name.includes('sbi') || name.includes('state bank')) {
    return {
      colors: ['#0055A5', '#0070D1', '#40B4E5'], // SBI Blue gradient
      icon: {
        type: 'image',
        source: require('../../assets/other/sbi.png'),
      },
    };
  }

  // Add more custom cards here in the future

  // Default configuration
  return {
    colors: null, // Will fallback to default gradient based on defaultColor
    icon: {
      type: 'icon',
      source: 'card', // Ionicons name
    },
  };
};
