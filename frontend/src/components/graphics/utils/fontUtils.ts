// Font utilities for system font detection and management

export interface SystemFont {
  family: string;
  fullName: string;
  postscriptName: string;
  style?: string;
}

// Check if Local Font Access API is available
export const isLocalFontAccessSupported = (): boolean => {
  return 'queryLocalFonts' in window;
};

// Get all system fonts using Local Font Access API
export const getSystemFonts = async (): Promise<SystemFont[]> => {
  if (!isLocalFontAccessSupported()) {
    console.warn('Local Font Access API is not supported in this browser');
    return getFallbackFonts();
  }

  try {
    // Request permission and get fonts
    // @ts-ignore - TypeScript doesn't have types for this API yet
    const availableFonts = await window.queryLocalFonts();
    
    // Process and deduplicate fonts
    const fontMap = new Map<string, SystemFont>();
    
    for (const fontData of availableFonts) {
      const family = fontData.family;
      if (!fontMap.has(family)) {
        fontMap.set(family, {
          family: fontData.family,
          fullName: fontData.fullName,
          postscriptName: fontData.postscriptName,
          style: fontData.style
        });
      }
    }
    
    // Sort fonts alphabetically
    const fonts = Array.from(fontMap.values()).sort((a, b) => 
      a.family.localeCompare(b.family)
    );
    
    return fonts;
  } catch (error) {
    console.error('Error accessing local fonts:', error);
    return getFallbackFonts();
  }
};

// Categorize fonts based on common patterns
export const categorizeFonts = (fonts: SystemFont[]): Record<string, SystemFont[]> => {
  const categories: Record<string, SystemFont[]> = {
    'Sans-serif': [],
    'Serif': [],
    'Monospace': [],
    'Display': [],
    'Script': [],
    'System': [],
    'Other': []
  };

  fonts.forEach(font => {
    const family = font.family.toLowerCase();
    
    // Categorize based on font name patterns
    if (family.includes('sans') || family.includes('arial') || family.includes('helvetica') || 
        family.includes('roboto') || family.includes('ubuntu') || family.includes('segoe') ||
        family.includes('tahoma') || family.includes('verdana') || family.includes('calibri')) {
      categories['Sans-serif'].push(font);
    } else if (family.includes('serif') && !family.includes('sans') || family.includes('times') || 
               family.includes('georgia') || family.includes('garamond') || family.includes('baskerville') ||
               family.includes('palatino') || family.includes('cambria')) {
      categories['Serif'].push(font);
    } else if (family.includes('mono') || family.includes('courier') || family.includes('consolas') ||
               family.includes('monaco') || family.includes('menlo') || family.includes('code')) {
      categories['Monospace'].push(font);
    } else if (family.includes('script') || family.includes('hand') || family.includes('cursive') ||
               family.includes('brush') || family.includes('marker')) {
      categories['Script'].push(font);
    } else if (family.includes('display') || family.includes('impact') || family.includes('comic') ||
               family.includes('papyrus') || family.includes('fantasy')) {
      categories['Display'].push(font);
    } else if (family.startsWith('-apple') || family.startsWith('system') || family.includes('ui-')) {
      categories['System'].push(font);
    } else {
      categories['Other'].push(font);
    }
  });

  // Remove empty categories
  Object.keys(categories).forEach(key => {
    if (categories[key].length === 0) {
      delete categories[key];
    }
  });

  return categories;
};

// Fallback fonts if API is not available
const getFallbackFonts = (): SystemFont[] => {
  const fallbackFonts = [
    // Basic web-safe fonts
    'Arial', 'Helvetica', 'Times New Roman', 'Times', 'Courier New', 'Courier',
    'Verdana', 'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
    'Trebuchet MS', 'Arial Black', 'Impact', 'Lucida Sans Unicode', 'Tahoma',
    'Lucida Console', 'Monaco', 'Consolas',
    // System fonts
    '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Ubuntu',
    'Helvetica Neue', 'sans-serif', 'serif', 'monospace'
  ];

  return fallbackFonts.map(family => ({
    family,
    fullName: family,
    postscriptName: family
  }));
};

// Test if a font is available
export const isFontAvailable = (fontFamily: string): boolean => {
  // Create a test element
  const testString = 'mmmmmmmmmmlli';
  const testSize = '72px';
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) return false;

  // Compare widths with fallback fonts
  const fallbackFonts = ['monospace', 'sans-serif', 'serif'];
  
  for (const fallback of fallbackFonts) {
    context.font = `${testSize} ${fallback}`;
    const fallbackWidth = context.measureText(testString).width;
    
    context.font = `${testSize} "${fontFamily}", ${fallback}`;
    const testWidth = context.measureText(testString).width;
    
    if (testWidth !== fallbackWidth) {
      return true;
    }
  }
  
  return false;
};