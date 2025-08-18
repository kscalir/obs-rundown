import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Files, Gear } from 'react-bootstrap-icons';

const EpisodeManagementModal = ({ 
  isOpen, 
  onClose, 
  episodes, 
  selectedEpisode, 
  onEpisodeCreated, 
  onEpisodeUpdated, 
  onEpisodeDeleted,
  onEpisodeSelected,
  api,
  showId 
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [duplicating, setDuplicating] = useState(null);
  const [showNewEpisodeForm, setShowNewEpisodeForm] = useState(false);
  const [newEpisodeName, setNewEpisodeName] = useState('');

  useEffect(() => {
    if (editingEpisode) {
      setFormData({
        name: editingEpisode.name || '',
        description: editingEpisode.description || '',
        duration: editingEpisode.duration || '',
        notes: editingEpisode.notes || ''
      });
    }
  }, [editingEpisode]);

  const handleCreate = async () => {
    if (!newEpisodeName.trim()) {
      toast.error('Episode name is required');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/api/episodes/show/${showId}`, {
        name: newEpisodeName,
        description: '',
        duration: '',
        notes: ''
      });
      
      toast.success('Episode created successfully');
      if (onEpisodeCreated) onEpisodeCreated(response);
      setNewEpisodeName('');
      setShowNewEpisodeForm(false);
    } catch (error) {
      toast.error('Failed to create episode');
      console.error('Create episode error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!formData.name.trim()) {
      toast.error('Episode name is required');
      return;
    }

    setLoading(true);
    try {
      const response = await api.patch(`/api/episodes/${editingEpisode.id}`, {
        name: formData.name
      });
      
      toast.success('Episode updated successfully');
      // Use the response if available, otherwise merge the form data
      const updatedEpisode = response || { ...editingEpisode, ...formData };
      if (onEpisodeUpdated) {
        onEpisodeUpdated(updatedEpisode);
      }
      setShowSettings(false);
      setEditingEpisode(null);
    } catch (error) {
      toast.error('Failed to update episode');
      console.error('Update episode error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEpisode) return;

    setLoading(true);
    try {
      await api.delete(`/api/episodes/${editingEpisode.id}`);
      toast.success('Episode deleted successfully');
      if (onEpisodeDeleted) onEpisodeDeleted(editingEpisode.id);
      setShowSettings(false);
      setEditingEpisode(null);
      setDeleteConfirm(false);
    } catch (error) {
      toast.error('Failed to delete episode');
      console.error('Delete episode error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (ep) => {
    setDuplicating(ep.id);
    try {
      const response = await api.post(`/api/episodes/show/${showId}`, {
        name: `${ep.name} (Copy)`,
        description: ep.description,
        duration: ep.duration,
        notes: ep.notes
      });
      
      // Copy all segments and items
      const segments = await api.get(`/api/episodes/${ep.id}/segments?include=groups,items`);
      for (const segment of segments) {
        const newSegment = await api.post(`/api/episodes/${response.id}/segments`, {
          name: segment.name,
          position: segment.position
        });
        
        for (const group of (segment.groups || [])) {
          const newGroup = await api.post(`/api/segments/${newSegment.id}/groups`, {
            name: group.name,
            position: group.position
          });
          
          for (const item of (group.items || [])) {
            await api.post(`/api/groups/${newGroup.id}/items`, {
              type: item.type,
              title: item.title,
              data: item.data,
              position: item.position,
              automation_mode: item.automation_mode,
              automation_duration: item.automation_duration
            });
          }
        }
      }
      
      toast.success('Episode duplicated successfully');
      if (onEpisodeCreated) onEpisodeCreated(response);
    } catch (error) {
      toast.error('Failed to duplicate episode');
      console.error('Duplicate episode error:', error);
    } finally {
      setDuplicating(null);
    }
  };

  if (!isOpen) return null;

  // Settings Modal (Edit/Delete)
  if (showSettings && editingEpisode) {
    return (
      <>
        {/* Backdrop */}
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            animation: 'fadeIn 200ms ease'
          }}
          onClick={() => {
            setShowSettings(false);
            setEditingEpisode(null);
            setDeleteConfirm(false);
          }}
        />
        
        {/* Settings Modal */}
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          width: '90%',
          maxWidth: 450,
          zIndex: 1001,
          animation: 'slideUp 300ms ease'
        }}>
          {/* Header */}
          <div style={{
            padding: '24px 24px 20px',
            borderBottom: '1px solid #e1e6ec'
          }}>
            <h2 style={{ 
              margin: 0, 
              fontSize: 24, 
              color: '#4a90e2',
              textAlign: 'center',
              fontWeight: 600
            }}>
              Episode Settings
            </h2>
          </div>

          {/* Content */}
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                marginBottom: 8,
                fontSize: 14,
                fontWeight: 500,
                color: '#666'
              }}>
                Rename Episode
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter episode name"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e1e6ec',
                  borderRadius: 12,
                  fontSize: 16,
                  outline: 'none',
                  transition: 'border-color 200ms',
                  boxSizing: 'border-box'
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#4a90e2'}
                onBlur={e => e.currentTarget.style.borderColor = '#e1e6ec'}
              />
            </div>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: 12,
              marginTop: 24
            }}>
              <button
                onClick={handleUpdate}
                disabled={loading || !formData.name.trim()}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  border: '2px solid #4a90e2',
                  borderRadius: 12,
                  background: '#fff',
                  color: '#4a90e2',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: loading || !formData.name.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !formData.name.trim() ? 0.6 : 1,
                  transition: 'all 200ms'
                }}
                onMouseEnter={e => {
                  if (!loading && formData.name.trim()) {
                    e.currentTarget.style.background = '#4a90e2';
                    e.currentTarget.style.color = '#fff';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.color = '#4a90e2';
                }}
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowSettings(false);
                  setEditingEpisode(null);
                  setDeleteConfirm(false);
                }}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: 12,
                  background: '#6c7a8a',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 200ms'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#5a6776';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#6c7a8a';
                }}
              >
                Cancel
              </button>
            </div>

            {/* Delete Section */}
            <div style={{
              marginTop: 32,
              paddingTop: 24,
              borderTop: '1px solid #e1e6ec'
            }}>
              {!deleteConfirm ? (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: 12,
                    background: '#dc3545',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 200ms'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#c82333';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#dc3545';
                  }}
                >
                  Delete Episode
                </button>
              ) : (
                <div style={{
                  textAlign: 'center'
                }}>
                  <p style={{
                    margin: '0 0 16px 0',
                    color: '#dc3545',
                    fontSize: 15
                  }}>
                    Are you sure you want to delete this episode?
                  </p>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={handleDelete}
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: 8,
                        background: '#dc3545',
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1
                      }}
                    >
                      Yes, Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      style={{
                        flex: 1,
                        padding: '10px 20px',
                        border: '1px solid #999',
                        borderRadius: 8,
                        background: '#fff',
                        color: '#666',
                        fontSize: 14,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Main Episode Selection Modal
  return (
    <>
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          animation: 'fadeIn 200ms ease'
        }}
        onClick={onClose}
      />
      
      {/* Main Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        width: '90%',
        maxWidth: 600,
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1001,
        animation: 'slideUp 300ms ease'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 20px',
          borderBottom: '1px solid #e1e6ec'
        }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: 28, 
            color: '#4a90e2',
            textAlign: 'center',
            fontWeight: 600
          }}>
            Select an Episode
          </h2>
       
          
        </div>

        {/* Episodes List */}
        <div style={{ 
          flex: 1, 
          overflow: 'auto', 
          padding: '20px',
          minHeight: 0
        }}>
          {showNewEpisodeForm ? (
            <div style={{
              padding: '16px',
              background: '#f8f9fa',
              borderRadius: 12,
              marginBottom: 16
            }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{
                  display: 'block',
                  marginBottom: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#666'
                }}>
                  New Episode Name
                </label>
                <input
                  type="text"
                  value={newEpisodeName}
                  onChange={e => setNewEpisodeName(e.target.value)}
                  placeholder="Enter episode name"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '2px solid #e1e6ec',
                    borderRadius: 8,
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#4a90e2'}
                  onBlur={e => e.currentTarget.style.borderColor = '#e1e6ec'}
                  onKeyPress={e => {
                    if (e.key === 'Enter' && newEpisodeName.trim()) {
                      handleCreate();
                    }
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleCreate}
                  disabled={loading || !newEpisodeName.trim()}
                  style={{
                    padding: '8px 20px',
                    border: 'none',
                    borderRadius: 6,
                    background: '#4caf50',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: loading || !newEpisodeName.trim() ? 'not-allowed' : 'pointer',
                    opacity: loading || !newEpisodeName.trim() ? 0.6 : 1
                  }}
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowNewEpisodeForm(false);
                    setNewEpisodeName('');
                  }}
                  style={{
                    padding: '8px 20px',
                    border: '1px solid #999',
                    borderRadius: 6,
                    background: '#fff',
                    color: '#666',
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {episodes.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#999',
              fontSize: 16
            }}>
              No episodes yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {episodes.map(ep => (
                <div
                  key={ep.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px 20px',
                    background: selectedEpisode?.id === ep.id ? '#e3f2fd' : '#f8f9fa',
                    border: selectedEpisode?.id === ep.id ? '2px solid #4a90e2' : '2px solid #e1e6ec',
                    borderRadius: 16,
                    transition: 'all 200ms',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => {
                    if (selectedEpisode?.id !== ep.id) {
                      e.currentTarget.style.background = '#f0f5fa';
                      e.currentTarget.style.borderColor = '#c3d9f0';
                    }
                  }}
                  onMouseLeave={e => {
                    if (selectedEpisode?.id !== ep.id) {
                      e.currentTarget.style.background = '#f8f9fa';
                      e.currentTarget.style.borderColor = '#e1e6ec';
                    }
                  }}
                  onClick={() => {
                    if (onEpisodeSelected) {
                      onEpisodeSelected(ep);
                      onClose();
                    }
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: 18, 
                      fontWeight: 600, 
                      color: '#333',
                      marginBottom: ep.description ? 4 : 0
                    }}>
                      {ep.name}
                    </div>
                    {ep.description && (
                      <div style={{ fontSize: 13, color: '#666' }}>
                        {ep.description}
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEpisodeSelected) {
                          onEpisodeSelected(ep);
                          onClose();
                        }
                      }}
                      style={{
                        padding: '8px 20px',
                        border: 'none',
                        borderRadius: 20,
                        background: '#4a90e2',
                        color: '#fff',
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 200ms'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#3a7bc8';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = '#4a90e2';
                      }}
                    >
                      Go
                    </button>
                    
                    {/* Duplicate Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(ep);
                      }}
                      disabled={duplicating === ep.id}
                      style={{
                        padding: '8px',
                        border: 'none',
                        borderRadius: 8,
                        background: 'transparent',
                        color: duplicating === ep.id ? '#999' : '#666',
                        fontSize: 20,
                        cursor: duplicating === ep.id ? 'not-allowed' : 'pointer',
                        transition: 'all 200ms',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={e => {
                        if (duplicating !== ep.id) {
                          e.currentTarget.style.background = '#e1e6ec';
                        }
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                      title="Duplicate Episode"
                    >
                      {duplicating === ep.id ? '⏳' : <Files size={18} />}
                    </button>
                    
                    {/* Settings Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingEpisode(ep);
                        setShowSettings(true);
                      }}
                      style={{
                        padding: '8px',
                        border: 'none',
                        borderRadius: 8,
                        background: 'transparent',
                        color: '#666',
                        fontSize: 20,
                        cursor: 'pointer',
                        transition: 'all 200ms',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#e1e6ec';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                      title="Episode Settings"
                    >
                      <Gear size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Add Episode Button */}
        <div style={{
          padding: '20px',
          borderTop: '1px solid #e1e6ec',
          textAlign: 'center'
        }}>
          {!showNewEpisodeForm && (
            <button
              onClick={() => setShowNewEpisodeForm(true)}
              style={{
                padding: '12px 32px',
                border: 'none',
                borderRadius: 20,
                background: '#4a90e2',
                color: '#fff',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 200ms'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#3a7bc8';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#4a90e2';
              }}
            >
              + Add Episode
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, -45%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </>
  );
};

export default EpisodeManagementModal;