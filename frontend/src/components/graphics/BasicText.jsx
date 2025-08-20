import React from 'react';

const BasicText = ({ children, style = {} }) => {
  console.log('BasicText rendering:', children);
  
  return (
    <span style={style}>
      {children}
    </span>
  );
};

export default BasicText;