import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, CheckCircle } from 'react-bootstrap-icons';
import { getSystemFonts, categorizeFonts, isLocalFontAccessSupported, SystemFont } from '../utils/fontUtils';

interface FontSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const FontSelector: React.FC<FontSelectorProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [fonts, setFonts] = useState<SystemFont[]>([]);
  const [categorizedFonts, setCategorizedFonts] = useState<Record<string, SystemFont[]>>({});
  const [loading, setLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load system fonts - don't auto-load, wait for user permission
  useEffect(() => {
    // Check if API is supported
    if (!isLocalFontAccessSupported()) {
      console.log('Local Font Access API not supported');
      setPermissionDenied(true);
    } else {
      console.log('Local Font Access API is supported');
      // Don't auto-load, show permission button instead
      setPermissionDenied(true);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter fonts based on search
  const getFilteredFonts = () => {
    if (!searchTerm) return categorizedFonts;

    const filtered: Record<string, SystemFont[]> = {};
    const term = searchTerm.toLowerCase();

    Object.entries(categorizedFonts).forEach(([category, fonts]) => {
      const matchingFonts = fonts.filter(font => 
        font.family.toLowerCase().includes(term)
      );
      if (matchingFonts.length > 0) {
        filtered[category] = matchingFonts;
      }
    });

    return filtered;
  };

  const handleRequestPermission = async () => {
    setLoading(true);
    try {
      const systemFonts = await getSystemFonts();
      setFonts(systemFonts);
      setCategorizedFonts(categorizeFonts(systemFonts));
      setPermissionDenied(false);
    } catch (error) {
      console.error('Permission denied or error:', error);
      setPermissionDenied(true);
    } finally {
      setLoading(false);
    }
  };

  const filteredFonts = getFilteredFonts();
  const selectedFont = fonts.find(f => f.family === value);

  return (
    <div ref={dropdownRef} style={styles.container}>
      {/* Selected value display */}
      <div 
        style={styles.selector}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ fontFamily: value, flex: 1 }}>{value}</span>
        <ChevronDown size={14} color="currentColor" style={{
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }} />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div style={styles.dropdown}>
          {/* Search bar */}
          <div style={styles.searchContainer}>
            <Search size={14} color="#888" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search fonts..."
              style={styles.searchInput}
            />
          </div>

          {/* Permission request or fallback fonts when no system fonts loaded */}
          {(permissionDenied || fonts.length === 0) && (
            <div style={styles.permissionContainer}>
              {isLocalFontAccessSupported() ? (
                <>
                  <p style={styles.permissionText}>
                    {fonts.length === 0 
                      ? 'Load system fonts for more options'
                      : 'Permission needed to access system fonts'}
                  </p>
                  <button 
                    onClick={handleRequestPermission}
                    style={{
                      ...styles.permissionButton,
                      ...(loading ? { opacity: 0.6 } : {})
                    }}
                    disabled={loading}
                  >
                    {loading ? 'Loading fonts...' : 'Load System Fonts'}
                  </button>
                </>
              ) : (
                <p style={styles.permissionText}>
                  Your browser doesn't support system font access.
                  Using web-safe fonts only.
                </p>
              )}
              
              {/* Fallback fonts */}
              <div style={styles.fallbackSection}>
                <div style={styles.categoryHeader}>Web Safe Fonts</div>
                {['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 
                  'Courier New', 'Monaco', 'Impact', 'Comic Sans MS', 'Tahoma',
                  'Trebuchet MS', 'Palatino', 'Garamond', 'Bookman', 'Avant Garde'].map(font => (
                  <div
                    key={font}
                    style={{
                      ...styles.fontItem,
                      fontFamily: font,
                      ...(value === font ? styles.fontItemSelected : {})
                    }}
                    onClick={() => {
                      onChange(font);
                      setIsOpen(false);
                    }}
                  >
                    <span style={{ flex: 1 }}>{font}</span>
                    {value === font && <CheckCircle size={14} color="#1976d2" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Font list - show when we have system fonts loaded */}
          {fonts.length > 0 && !loading && (
            <div style={styles.fontList}>
              {Object.entries(filteredFonts).map(([category, fonts]) => (
                  <div key={category} style={styles.category}>
                    <div style={styles.categoryHeader}>{category}</div>
                    {fonts.map(font => (
                      <div
                        key={font.family}
                        style={{
                          ...styles.fontItem,
                          fontFamily: `"${font.family}"`,
                          ...(value === font.family ? styles.fontItemSelected : {})
                        }}
                        onClick={() => {
                          onChange(font.family);
                          setIsOpen(false);
                          setSearchTerm('');
                        }}
                        title={font.fullName}
                      >
                        <span style={{ flex: 1 }}>{font.family}</span>
                        {value === font.family && <CheckCircle size={14} color="#1976d2" />}
                      </div>
                    ))}
                  </div>
                ))}
              {Object.keys(filteredFonts).length === 0 && (
                <div style={styles.noResults}>No fonts found</div>
              )}
            </div>
          )}

          {/* Custom font option */}
          <div style={styles.customSection}>
            <input
              type="text"
              placeholder="Enter custom font name..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value) {
                  onChange(e.currentTarget.value);
                  setIsOpen(false);
                }
              }}
              style={styles.customInput}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    flex: 1
  },
  selector: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 8px',
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '4px',
    color: '#e0e0e0',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'border-color 0.2s'
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    background: '#252525',
    border: '1px solid #333',
    borderRadius: '4px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    zIndex: 1000,
    maxHeight: '400px',
    display: 'flex',
    flexDirection: 'column'
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px',
    borderBottom: '1px solid #333',
    gap: '8px'
  },
  searchInput: {
    flex: 1,
    padding: '4px 8px',
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '4px',
    color: '#e0e0e0',
    fontSize: '12px',
    outline: 'none'
  },
  fontList: {
    flex: 1,
    overflowY: 'auto',
    maxHeight: '280px'
  },
  category: {
    marginBottom: '4px'
  },
  categoryHeader: {
    padding: '4px 12px',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#888',
    background: '#1a1a1a',
    borderBottom: '1px solid #333',
    position: 'sticky',
    top: 0,
    zIndex: 1
  },
  fontItem: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#e0e0e0',
    cursor: 'pointer',
    transition: 'background 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  fontItemSelected: {
    background: '#1976d233',
    color: '#1976d2'
  },
  loading: {
    padding: '20px',
    textAlign: 'center',
    color: '#888',
    fontSize: '12px'
  },
  noResults: {
    padding: '20px',
    textAlign: 'center',
    color: '#666',
    fontSize: '12px'
  },
  customSection: {
    padding: '8px',
    borderTop: '1px solid #333'
  },
  customInput: {
    width: '100%',
    padding: '4px 8px',
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '4px',
    color: '#e0e0e0',
    fontSize: '12px',
    outline: 'none'
  },
  permissionContainer: {
    padding: '16px',
    textAlign: 'center'
  },
  permissionText: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '12px'
  },
  permissionButton: {
    padding: '8px 20px',
    background: '#1976d2',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '12px'
  },
  fallbackSection: {
    marginTop: '16px',
    textAlign: 'left'
  }
};