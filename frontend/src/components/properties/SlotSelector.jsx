import React from 'react';

/**
 * Simple, focused slot selector dropdown
 * Only handles UI and calls the update function
 */
export default function SlotSelector({ 
  slot, 
  slotIndex, 
  videoSources = [], 
  onUpdate,
  onValidate 
}) {
  const handleChange = (e) => {
    const newValue = e.target.value;
    console.log('[SlotSelector] Changing slot', slotIndex, 'to:', newValue);
    onUpdate(slotIndex, newValue);
  };

  const handleBlur = () => {
    if (onValidate) {
      onValidate(slotIndex);
    }
  };

  if (!slot.replaceable) {
    return <span>Fixed</span>;
  }

  return (
    <select
      value={slot.selectedSource || ""}
      onChange={handleChange}
      onBlur={handleBlur}
      style={{ width: '100%' }}
    >
      <option value="">— Choose source —</option>
      {videoSources.map(source => (
        <option key={source.name} value={source.name}>
          {source.name}
        </option>
      ))}
    </select>
  );
}