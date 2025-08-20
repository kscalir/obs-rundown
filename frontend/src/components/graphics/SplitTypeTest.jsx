import React, { useEffect, useRef } from 'react';
import SplitType from 'split-type';

const SplitTypeTest = ({ children, style = {} }) => {
  const textRef = useRef(null);

  useEffect(() => {
    console.log('SplitTypeTest: Testing SplitType');
    
    if (!textRef.current || !children) {
      console.log('SplitTypeTest: No textRef or children');
      return;
    }

    try {
      console.log('SplitTypeTest: Creating SplitType instance');
      const splitInstance = new SplitType(textRef.current, {
        types: 'chars',
        absolute: false
      });
      
      console.log('SplitTypeTest: SplitType created successfully', splitInstance.chars?.length, 'characters');
      
      return () => {
        try {
          splitInstance.revert();
        } catch (error) {
          console.error('SplitTypeTest: Error reverting split:', error);
        }
      };
    } catch (error) {
      console.error('SplitTypeTest: Error creating SplitType:', error);
    }
  }, [children]);
  
  return (
    <span ref={textRef} style={style}>
      {children}
    </span>
  );
};

export default SplitTypeTest;