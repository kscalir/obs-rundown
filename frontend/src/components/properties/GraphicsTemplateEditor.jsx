import React, { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from '../../config';

export default function GraphicsTemplateEditor({
  selectedItem,
  itemData,
  setRefreshKey,
  itemId,
  // optional: geometry of the placeholder this CG should live in
  placeholderRect, // { x, y, width, height } in pixels of the OBS preview canvas
  baseDims,        // { width, height } of the OBS preview canvas used for the rect
  fitMode = 'contain' // 'contain' | 'cover' | 'stretch'
}) {
  const getItemId = () => {
    if (typeof itemId === 'number' && !Number.isNaN(itemId)) return itemId;
    return currentItemIdRef.current;
  };
  useEffect(() => {
    if (typeof itemId === 'number' && !Number.isNaN(itemId)) {
      currentItemIdRef.current = itemId;
    }
  }, [itemId]);


  const useDebouncedCallback = (delay = 400) => {
    const timerRef = useRef(null);
    return (fn) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(fn, delay);
    };
  };

  const validateParam = (param, value) => {
    const type = (param?.type || '').toUpperCase();
    switch (type) {
      case 'STRING':
        return value != null && String(value).trim().length > 0;
      case 'COLOR':
        return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(value).trim());
      case 'NUMBER':
      case 'INTEGER': {
        if (value === '' || value === null || Number.isNaN(Number(value))) return false;
        if (param.min != null && Number(value) < param.min) return false;
        if (param.max != null && Number(value) > param.max) return false;
        return true;
      }
      case 'BOOL':
      case 'BOOLEAN':
        return typeof value === 'boolean';
      default:
        return true;
    }
  };

  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateData, setTemplateData] = useState({});
  const [localTemplateData, setLocalTemplateData] = useState({});
  const [selectedChannel, setSelectedChannel] = useState(1);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPreviewPopup, setShowPreviewPopup] = useState(false);
  const previewRef = useRef(null);
  const currentItemIdRef = useRef(null);
  const lastGoodDataRef = useRef({});
  const debouncer = useDebouncedCallback(450);
  const [selectedLayer, setSelectedLayer] = useState(1);
  const [templateIdValue, setTemplateIdValue] = useState("");
  const [fetchedItemData, setFetchedItemData] = useState(null);
  const [placeholders, setPlaceholders] = useState([]);
  const [isLoadingPlaceholders, setIsLoadingPlaceholders] = useState(false);
  const [placeholderValues, setPlaceholderValues] = useState({});

  // Keep placeholder geometry in the template data so preview & playout can fit
  useEffect(() => {
    if (!baseDims || !placeholderRect) return;
    const frame = {
      base: {
        width: Number(baseDims.width) || 0,
        height: Number(baseDims.height) || 0,
      },
      rect: {
        x: Number(placeholderRect.x) || 0,
        y: Number(placeholderRect.y) || 0,
        width: Number(placeholderRect.width) || 0,
        height: Number(placeholderRect.height) || 0,
      },
      fit: (templateData?.frame?.fit || fitMode || 'contain')
    };

    // Merge into both live and local state so UI and persistence stay aligned
    setTemplateData(prev => ({ ...(prev || {}), frame }));
    setLocalTemplateData(prev => ({ ...(prev || {}), frame }));
  }, [
    fitMode,
    baseDims && baseDims.width,
    baseDims && baseDims.height,
    placeholderRect && placeholderRect.x,
    placeholderRect && placeholderRect.y,
    placeholderRect && placeholderRect.width,
    placeholderRect && placeholderRect.height
  ]);

  // Fetch item payload if we only have an itemId and not selectedItem
  useEffect(() => {
    const id = getItemId();
    if (!selectedItem && typeof id === 'number' && !Number.isNaN(id)) {
      fetch(`${API_BASE_URL}/api/items/${id}`)
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`GET /api/items/${id} ${r.status}`)))
        .then(json => {
          setFetchedItemData(json?.data || {});
        })
        .catch(err => {
          console.error('[GFX] failed to fetch item for hydration:', err);
          setFetchedItemData({});
        });
    }
  }, [selectedItem, itemId]);

  useEffect(() => {
    console.log('[GFX] isLoading changed ->', isLoading);
  }, [isLoading]);

  useEffect(() => {
    if (typeof itemId === 'number' && !Number.isNaN(itemId)) {
      currentItemIdRef.current = itemId;
      return;
    }
    let id = undefined;
    if (typeof selectedItem?.itemId === 'number') id = selectedItem.itemId;
    else if (typeof selectedItem?.id === 'number') id = selectedItem.id;
    else if (typeof itemData?.id === 'number') id = itemData.id;

    if (id == null) {
      try {
        const queryMatch = window.location.search.match(/[?&]item=(\d+)/);
        if (queryMatch && queryMatch[1]) {
          const fromQuery = Number(queryMatch[1]);
          if (!Number.isNaN(fromQuery)) id = fromQuery;
        }
      } catch (_) {}
    }

    if (id != null && !Number.isNaN(Number(id))) {
      currentItemIdRef.current = Number(id);
    }
  }, [selectedItem?.itemId, selectedItem?.id, itemData?.id, itemId]);

  const getCgSlotInfo = (dataObj) => {
  const slots = Array.isArray(dataObj?.slots) ? dataObj.slots : [];
  let idx = -1;
  let slot = null;
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (s && typeof s.selectedSource === 'string' && s.selectedSource.startsWith('CG-')) {
      idx = i; slot = s; break;
    }
  }
  return { idx, slot };
};

const ensureSlotsShape = (dataObj) => {
  const out = { ...(dataObj || {}) };
  if (!Array.isArray(out.slots)) out.slots = [];
  // if no CG slot yet, create one at slot #1 by default
  const { slot } = getCgSlotInfo(out);
  if (!slot) {
    out.slots.push({
      slot: 1,
      replaceable: true,
      selectedSource: 'CG-1',
      sourceProps: {}
    });
  }
  return out;
};

  const buildPatchedItemData = (baseItemData, newSourceProps) => {
    const { idx, slot } = getCgSlotInfo(baseItemData || {});
    if (idx === -1 || !slot) return baseItemData || {};
    const newSlots = [...(baseItemData.slots || [])];
    newSlots[idx] = { ...slot, sourceProps: { ...(slot.sourceProps || {}), ...(newSourceProps || {}) } };
    return { ...(baseItemData || {}), slots: newSlots };
  };

  useEffect(() => {
    if (!selectedItem) return;
    const dataObj = itemData || selectedItem?.data || fetchedItemData || {};
    const { slot } = getCgSlotInfo(dataObj);
    const incoming = (slot?.sourceProps) || {};
    console.log('[GFX] hydrate A', {
      itemId: getItemId(),
      selectedItemId: selectedItem?.id ?? selectedItem?.itemId,
      hasItemDataData: !!itemData?.data,
      slots: (itemData?.data?.slots || selectedItem?.data?.slots || []),
      incomingTemplateId: incoming?.templateId
    });

    setTemplateData(prev => (incoming.templateId ? incoming : (prev || incoming)));
    setLocalTemplateData(prev => (incoming.templateId ? incoming : (prev || incoming)));

    lastGoodDataRef.current = (incoming.templateId)
      ? incoming
      : (Object.keys(lastGoodDataRef.current || {}).length ? lastGoodDataRef.current : incoming);

    if (incoming.templateId) {
      fetchTemplateDetails(incoming.templateId);
    }
    if (incoming.channel) {
      setSelectedChannel(incoming.channel);
    }
    if (incoming.layer) {
      setSelectedLayer(incoming.layer);
    }
    if (incoming.templateId) {
      setTemplateIdValue(incoming.templateId);
    }
  }, [
    selectedItem?.itemId,
    selectedItem?.id,
    JSON.stringify(itemData?.slots || []),
    JSON.stringify(fetchedItemData?.slots || [])
  ]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/templates`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch templates: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setTemplates(Array.isArray(data) ? data : []);
        console.log('[GFX] templates loaded', Array.isArray(data) ? data.map(t => t.id) : data);
      })
      .catch(err => {
        console.error("Error loading templates:", err);
        setError("Failed to load templates");
        console.warn('Failed to load templates — using fallback');
        setTemplates([
          {
            id: "lower-third",
            name: "Lower Third",
            description: "Name and title lower third graphic",
            parameters: [
              { id: "name", type: "STRING", default: "", info: "Name" },
              { id: "title", type: "STRING", default: "", info: "Title" },
              { id: "color", type: "COLOR", default: "#000000", info: "Background Color" }
            ]
          }
        ]);
      });
  }, []);

// Rehydrate selection from DB when templates or item change

useEffect(() => {
  // use the real data; don’t create default slots here
  const dataObj = itemData || selectedItem?.data || fetchedItemData || {};
  const { slot } = getCgSlotInfo(dataObj);
  const tid = slot?.sourceProps?.templateId || '';
  console.log('[GFX] hydrate B', {
    itemId: getItemId(),
    selectedItemId: selectedItem?.id ?? selectedItem?.itemId,
    tid,
    slotProps: slot?.sourceProps,
    templates: templates.map(t => t.id)
  });

  // Capture savedProps once for use throughout this effect
  const savedProps = slot?.sourceProps || {};

  if (tid) {
    if (templateIdValue !== tid) setTemplateIdValue(tid);

    if (templateData?.templateId !== tid) setTemplateData(savedProps);
    if (localTemplateData?.templateId !== tid) setLocalTemplateData(savedProps);

    // Rehydrate channel/layer selectors from savedProps
    if (typeof savedProps.channel === 'number') {
      setSelectedChannel(savedProps.channel);
    } else if (savedProps.channel) {
      // handle string-y numbers just in case
      const ch = Number(savedProps.channel);
      if (!Number.isNaN(ch)) setSelectedChannel(ch);
    }
    if (typeof savedProps.layer === 'number') {
      setSelectedLayer(savedProps.layer);
    } else if (savedProps.layer) {
      const ly = Number(savedProps.layer);
      if (!Number.isNaN(ly)) setSelectedLayer(ly);
    }

    const match = templates.find(t => t.id === tid);
    if (match && selectedTemplate?.id !== match.id) {
      console.log('[GFX] hydrate B: selecting template', match.id);
      setSelectedTemplate(match);
    }
  } else {
    if (templateIdValue !== '') setTemplateIdValue('');
    if (selectedTemplate) setSelectedTemplate(null);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  templates,
  selectedItem?.id,
  selectedItem?.itemId,
  JSON.stringify(itemData?.slots || []),
  JSON.stringify(fetchedItemData?.slots || [])
]);

  useEffect(() => {
    const tid =
      (localTemplateData && localTemplateData.templateId) ??
      (templateData && templateData.templateId);

    console.log('[GFX] effect templates/local', { tid, haveSelectedTemplate: !!selectedTemplate });
    if (tid) {
      const match = templates.find(t => t.id === tid);
      if (match && (!selectedTemplate || selectedTemplate.id !== match.id)) {
        setSelectedTemplate(match);
      }
      if (templateIdValue !== tid) {
        setTemplateIdValue(tid);
      }
    }
  }, [templates, localTemplateData?.templateId, templateData?.templateId]);

  useEffect(() => {
    const tid =
      (localTemplateData && localTemplateData.templateId) ??
      (templateData && templateData.templateId) ??
      templateIdValue;

    if (!tid) {
      setPlaceholders([]);
      setPlaceholderValues({});
      return;
    }

    setIsLoadingPlaceholders(true);
    fetch(`${API_BASE_URL}/api/templates/${tid}/placeholders`)
      .then(res => res.ok ? res.json() : Promise.reject(new Error(`GET /api/templates/${tid}/placeholders ${res.status}`)))
      .then(list => {
        const items = Array.isArray(list)
          ? list.map(p => (typeof p === 'string' ? { id: p, label: p } : p))
          : [];
        setPlaceholders(items);

        // hydrate from saved values in the item
        const hydrated = {};
        items.forEach(p => {
          const id = p && typeof p === 'object' ? p.id : p;
          if (Object.prototype.hasOwnProperty.call(localTemplateData, id)) hydrated[id] = localTemplateData[id];
          else if (Object.prototype.hasOwnProperty.call(templateData, id)) hydrated[id] = templateData[id];
          else hydrated[id] = "";
        });
        setPlaceholderValues(hydrated);
      })
      .catch(err => {
        console.error('[GFX] failed to load placeholders:', err);
        setPlaceholders([]);
        setPlaceholderValues({});
      })
      .finally(() => setIsLoadingPlaceholders(false));
  }, [selectedTemplate?.id, templateIdValue, localTemplateData?.templateId, templateData?.templateId]);

  useEffect(() => {
    if (!placeholders.length) return;
    const hydrated = {};
    placeholders.forEach(p => {
      const id = p && typeof p === 'object' ? p.id : p;
      if (Object.prototype.hasOwnProperty.call(localTemplateData, id)) hydrated[id] = localTemplateData[id];
      else if (Object.prototype.hasOwnProperty.call(templateData, id)) hydrated[id] = templateData[id];
      else hydrated[id] = "";
    });
    setPlaceholderValues(hydrated);
  }, [JSON.stringify(placeholders), JSON.stringify(localTemplateData), JSON.stringify(templateData)]);

  useEffect(() => {
    if (!selectedTemplate || !templateData.templateId) {
      setPreviewUrl("");
      return;
    }
    const dataParam = encodeURIComponent(JSON.stringify(templateData));
    const url = `${API_BASE_URL}/api/templates/${templateData.templateId}/preview?data=${dataParam}`;
    setPreviewUrl(url);
    lastGoodDataRef.current = templateData;
  }, [selectedTemplate, templateData]);

  const fetchTemplateDetails = (templateId) => {
    if (!templateId) return;

    fetch(`${API_BASE_URL}/api/templates/${templateId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch template details");
        return res.json();
      })
      .then((template) => {
        setSelectedTemplate(template);
      })
      .catch((err) => {
        console.error("Error loading template details:", err);
        const template = templates.find((t) => t.id === templateId);
        if (template) setSelectedTemplate(template);
      });
  };

    const handleTemplateChange = async (e) => {
    const templateId = e.target.value || null;
    const currentItemId = getItemId();
    if (!currentItemId) {
      console.warn('[GFX] No current item id; aborting PATCH');
      setIsLoading(false);
      return;
    }
    setTemplateIdValue(templateId ?? ''); // keep UI sticky
    setPlaceholders([]);
    setPlaceholderValues({});

    // log for visibility
    console.log('[GFX] template dropdown changed ->', templateId, 'for item', currentItemId, '(prop itemId =', itemId, ') selectedItem:', selectedItem);

    setIsLoading(true);
    try {
      // 1) start from safe local data (fall back to selectedItem?.data, then {})
      let baseData = fetchedItemData || itemData || selectedItem?.data || {};
      baseData = ensureSlotsShape(baseData);

      // 2) locate CG slot
      const { idx, slot } = getCgSlotInfo(baseData);
      if (idx === -1 || !slot) {
        console.warn('[GFX] No CG slot found after ensureSlotsShape; creating one');
        baseData = ensureSlotsShape(baseData);
      }
      const found = getCgSlotInfo(baseData);
      const cgIdx = found.idx;
      const cgSlot = { ...found.slot };

      // 3) merge sourceProps with new template selection
      const newSourceProps = {
        ...(cgSlot.sourceProps || {}),
        templateId: templateId || undefined, // remove on "None"
        channel: cgSlot.sourceProps?.channel ?? 1,
        frame: (baseDims && placeholderRect) ? {
          base: { width: Number(baseDims.width)||0, height: Number(baseDims.height)||0 },
          rect: { x: Number(placeholderRect.x)||0, y: Number(placeholderRect.y)||0, width: Number(placeholderRect.width)||0, height: Number(placeholderRect.height)||0 },
          fit: fitMode || 'contain'
        } : (cgSlot.sourceProps && cgSlot.sourceProps.frame) // keep any saved frame
      };

      // prune undefined keys (so we don't store them)
      Object.keys(newSourceProps).forEach(k => newSourceProps[k] === undefined && delete newSourceProps[k]);

      const newSlots = [...baseData.slots];
      newSlots[cgIdx] = { ...cgSlot, sourceProps: newSourceProps };

      const newData = { ...baseData, slots: newSlots };

      // 4) optimistic UI update
      setLocalTemplateData(newSourceProps);
      setTemplateData(newSourceProps);

      // 5) persist to backend
      const resp = await fetch(`${API_BASE_URL}/api/items/${currentItemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: newData })
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error('[GFX] PATCH failed', resp.status, text);
        throw new Error(text || `PATCH /api/items/${currentItemId} failed`);
      }

      const saved = await resp.json();
      // normalize saved.data and keep state in sync
      const savedData = saved?.data || newData;
      // re-locate CG slot on the saved payload
      const _found = getCgSlotInfo(savedData || {});
      const savedProps = _found.slot?.sourceProps || newSourceProps;

      setLocalTemplateData(savedProps);
      setTemplateData(savedProps);
      setTemplateIdValue(savedProps?.templateId ?? '');
      setFetchedItemData(savedData);
    } catch (err) {
      console.error('handleTemplateChange error:', err);
      // optionally toast here
    } finally {
      setIsLoading(false); // always re-enable the dropdown
    }
  };



  const handleFieldChange = (paramId, value) => {
    const paramDef = (selectedTemplate?.parameters || []).find(p => p.id === paramId) || { id: paramId };
    const isValid = validateParam(paramDef, value);
    if (!isValid) {
      console.warn(`Invalid value for "${paramDef.info || paramId}"`);
      const revertValue = lastGoodDataRef.current[paramId] ?? paramDef.default ?? '';
      setLocalTemplateData(prev => ({ ...prev, [paramId]: revertValue }));
      return;
    }
    const targetItemId = getItemId() || currentItemIdRef.current;
    if (!targetItemId) { console.warn('[GFX] No item id in handleFieldChange; aborting'); return; }

    const newData = { ...templateData, [paramId]: value };
    setTemplateData(newData);
    setLocalTemplateData(prev => ({ ...prev, [paramId]: value }));

    debouncer(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/items/${targetItemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: buildPatchedItemData(ensureSlotsShape(fetchedItemData || itemData || selectedItem?.data || {}), newData) }),
        });
        if (!res.ok) throw new Error("Failed to update field");
        let updated = null;
        try {
          updated = await res.json();
        } catch (_) {}
        if (!updated || !updated.data) {
          const getRes = await fetch(`${API_BASE_URL}/api/items/${targetItemId}`);
          if (getRes.ok) {
            updated = await getRes.json();
          }
        }
        if (updated && updated.data) {
          const { slot } = getCgSlotInfo(updated.data);
          const srvSourceProps = (slot && slot.sourceProps) ? slot.sourceProps : newData;
          lastGoodDataRef.current = srvSourceProps;
          setTemplateData(srvSourceProps);
          setLocalTemplateData(srvSourceProps);
        } else {
          lastGoodDataRef.current = newData;
        }
        console.log('Saved');
        if (previewRef.current) {
          previewRef.current.contentWindow.postMessage(newData, "*");
        }
      } catch (err) {
        console.error("Error updating field:", err);
        console.warn('Save failed — reverted');
        setTemplateData(lastGoodDataRef.current);
        setLocalTemplateData(lastGoodDataRef.current);
        setError("Failed to update field");
      }
    });
  };

  const handleChannelChange = async (e) => {
    const channel = Number(e.target.value);
    setSelectedChannel(channel);
    const targetItemId = getItemId() || currentItemIdRef.current;
    if (!targetItemId) { console.warn('[GFX] No item id in handleChannelChange; abort'); return; }

    const newData = { ...templateData, channel };
    setTemplateData(newData);

    try {
      const res = await fetch(`${API_BASE_URL}/api/items/${targetItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: buildPatchedItemData(ensureSlotsShape(fetchedItemData || itemData || selectedItem?.data || {}), newData) }),
      });

      if (!res.ok) throw new Error("Failed to update channel");
      const getRes = await fetch(`${API_BASE_URL}/api/items/${targetItemId}`);
      if (getRes.ok) {
        const updated = await getRes.json();
        const { slot } = getCgSlotInfo(updated.data || {});
        if (slot && slot.sourceProps) {
          setTemplateData(slot.sourceProps);
          setLocalTemplateData(slot.sourceProps);
        }
      }
    } catch (err) {
      console.error("Error updating channel:", err);
      setError("Failed to update channel");
      console.warn('Failed to update channel');
    }
  };

  const handleLayerChange = async (e) => {
    const layer = Number(e.target.value);
    setSelectedLayer(layer);
    const targetItemId = getItemId() || currentItemIdRef.current;
    if (!targetItemId) { console.warn('[GFX] No item id in handleLayerChange; abort'); return; }
    const newData = { ...templateData, layer };
    setTemplateData(newData);
    try {
      const res = await fetch(`${API_BASE_URL}/api/items/${targetItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: buildPatchedItemData(ensureSlotsShape(fetchedItemData || itemData || selectedItem?.data || {}), newData) }),
      });
      if (!res.ok) throw new Error("Failed to update layer");
      const getRes = await fetch(`${API_BASE_URL}/api/items/${targetItemId}`);
      if (getRes.ok) {
        const updated = await getRes.json();
        const { slot } = getCgSlotInfo(updated.data || {});
        if (slot && slot.sourceProps) {
          lastGoodDataRef.current = slot.sourceProps;
          setTemplateData(slot.sourceProps);
          setLocalTemplateData(slot.sourceProps);
        } else {
          lastGoodDataRef.current = newData;
        }
      } else {
        lastGoodDataRef.current = newData;
      }
      console.log('Layer updated');
    } catch (err) {
      console.error("Error updating layer:", err);
      console.warn('Failed to update layer');
      setError("Failed to update layer");
    }
  };

  const handleTitleChange = (newTitle) => {
    const targetItemId = getItemId() || currentItemIdRef.current;
    if (!targetItemId) { console.warn('[GFX] No item id in handleTitleChange; abort'); return; }
    debouncer(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/items/${targetItemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        });
        if (!res.ok) throw new Error("Failed to update title");
        console.log('Title saved');
      } catch (err) {
        console.error("Error updating title:", err);
        console.warn('Failed to save title');
        setError("Failed to update title");
      }
    });
  };

  const handleCommand = async (command) => {
    const targetItemId = getItemId() || currentItemIdRef.current;
    if (!targetItemId || !templateData.templateId) return;

    setIsLoading(true);
    setError(null);

    try {
      const amcpCommand = {
        'play': 'cg_add',
        'update': 'cg_update',
        'stop': 'cg_stop'
      }[command] || command;

      const res = await fetch(`${API_BASE_URL}/api/graphics/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: amcpCommand,
          channel: selectedChannel,
          layer: templateData.layer || selectedLayer || 1,
          templateId: templateData.templateId,
          data: {
            ...templateData,
            frame: templateData.frame || (baseDims && placeholderRect ? {
              base: { width: Number(baseDims.width)||0, height: Number(baseDims.height)||0 },
              rect: { x: Number(placeholderRect.x)||0, y: Number(placeholderRect.y)||0, width: Number(placeholderRect.width)||0, height: Number(placeholderRect.height)||0 },
              fit: fitMode || 'contain'
            } : undefined)
          },
        }),
      });

      if (!res.ok) throw new Error(`Failed to send ${command} command`);

      const result = await res.json();
      console.log('AMCP command result:', result);

      const newData = {
        ...templateData,
        lastCommand: command,
        lastCommandTime: new Date().toISOString(),
      };

      setTemplateData(newData);

      await fetch(`${API_BASE_URL}/api/items/${targetItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: buildPatchedItemData(ensureSlotsShape(fetchedItemData || itemData || selectedItem?.data || {}), newData) }),
      });

      setRefreshKey((k) => k + 1);

    } catch (err) {
      console.error(`Error sending ${command} command:`, err);
      setError(`Failed to ${command} template`);
      console.warn(`Failed to ${command}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewMouseDown = (e) => {
    if (previewUrl) {
      e.preventDefault();
      setShowPreviewPopup(true);
    }
  };

  useEffect(() => {
    if (!showPreviewPopup) return;
    const handleGlobalMouseUp = () => {
      setShowPreviewPopup(false);
    };
    document.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [showPreviewPopup]);

  const renderParameterInput = (param) => {
    switch (param.type) {
      case "STRING":
        return (
          <input
            type="text"
            value={localTemplateData.hasOwnProperty(param.id)
              ? localTemplateData[param.id]
              : (templateData[param.id] || "")}
            onChange={(e) => {
              setLocalTemplateData(prev => ({
                ...prev,
                [param.id]: e.target.value
              }));
            }}
            onBlur={(e) => {
              handleFieldChange(param.id, e.target.value);
            }}
            placeholder={param.info || param.id}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: 4,
              marginTop: 4,
            }}
          />
        );
      case "NUMBER":
      case "INTEGER":
        return (
          <input
            type="number"
            value={localTemplateData.hasOwnProperty(param.id)
              ? localTemplateData[param.id]
              : (templateData[param.id] || 0)}
            onChange={(e) => {
              setLocalTemplateData(prev => ({
                ...prev,
                [param.id]: Number(e.target.value) || 0
              }));
            }}
            onBlur={(e) => {
              handleFieldChange(param.id, Number(e.target.value) || 0);
            }}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: 4,
              marginTop: 4,
            }}
          />
        );
      case "COLOR":
        return (
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <input
              type="color"
              value={localTemplateData.hasOwnProperty(param.id)
                ? localTemplateData[param.id]
                : (templateData[param.id] || "#000000")}
              onChange={(e) => {
                const newValue = e.target.value;
                setLocalTemplateData(prev => ({
                  ...prev,
                  [param.id]: newValue
                }));
                handleFieldChange(param.id, newValue);
              }}
              style={{ width: 40, height: 40 }}
            />
            <input
              type="text"
              value={localTemplateData.hasOwnProperty(param.id)
                ? localTemplateData[param.id]
                : (templateData[param.id] || "#000000")}
              onChange={(e) => {
                setLocalTemplateData(prev => ({
                  ...prev,
                  [param.id]: e.target.value
                }));
              }}
              onBlur={(e) => {
                handleFieldChange(param.id, e.target.value);
              }}
              style={{
                flex: 1,
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: 4,
              }}
            />
          </div>
        );
      case "BOOL":
      case "BOOLEAN":
        return (
          <label style={{ display: "flex", alignItems: "center", marginTop: 4 }}>
            <input
              type="checkbox"
              checked={!!(localTemplateData.hasOwnProperty(param.id)
                ? localTemplateData[param.id]
                : templateData[param.id])}
              onChange={(e) => {
                const newValue = e.target.checked;
                setLocalTemplateData(prev => ({
                  ...prev,
                  [param.id]: newValue
                }));
                handleFieldChange(param.id, newValue);
              }}
              style={{ marginRight: 8 }}
            />
            {param.info || param.id}
          </label>
        );
      default:
        return (
          <input
            type="text"
            value={localTemplateData.hasOwnProperty(param.id)
              ? localTemplateData[param.id]
              : (templateData[param.id] || "")}
            onChange={(e) => {
              setLocalTemplateData(prev => ({
                ...prev,
                [param.id]: e.target.value
              }));
            }}
            onBlur={(e) => {
              handleFieldChange(param.id, e.target.value);
            }}
            placeholder={param.info || param.id}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: 4,
              marginTop: 4,
            }}
          />
        );
    }
  };

  const renderPlaceholderInput = (ph) => {
    const id = (ph && typeof ph === 'object') ? ph.id : String(ph);
    const type = (ph && typeof ph === 'object') ? String(ph.type || 'STRING').toUpperCase() : 'STRING';

    const value = Object.prototype.hasOwnProperty.call(localTemplateData, id)
      ? localTemplateData[id]
      : (templateData[id] || ""); // default to blank, not template defaults

    switch (type) {
      case 'COLOR':
        return (
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <input
              type="color"
              value={value || '#000000'}
              onChange={(e) => {
                const v = e.target.value;
                setLocalTemplateData(prev => ({ ...prev, [id]: v }));
                handleFieldChange(id, v);
              }}
              style={{ width: 40, height: 40 }}
            />
            <input
              type="text"
              value={value}
              onChange={(e) => setLocalTemplateData(prev => ({ ...prev, [id]: e.target.value }))}
              onBlur={(e) => handleFieldChange(id, e.target.value)}
              placeholder={id}
              style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: 4 }}
            />
          </div>
        );
      case 'NUMBER':
      case 'INTEGER':
        return (
          <input
            type="number"
            value={value === '' ? '' : Number(value) || 0}
            onChange={(e) => setLocalTemplateData(prev => ({ ...prev, [id]: e.target.value }))}
            onBlur={(e) => handleFieldChange(id, e.target.value === '' ? '' : Number(e.target.value) || 0)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: 4, marginTop: 4 }}
          />
        );
      case 'BOOL':
      case 'BOOLEAN':
        return (
          <label style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => {
                const v = e.target.checked;
                setLocalTemplateData(prev => ({ ...prev, [id]: v }));
                handleFieldChange(id, v);
              }}
              style={{ marginRight: 8 }}
            />
            { (ph && typeof ph === 'object' ? (ph.label || id) : id) }
          </label>
        );
      case 'STRING':
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => setLocalTemplateData(prev => ({ ...prev, [id]: e.target.value }))}
            onBlur={(e) => handleFieldChange(id, e.target.value)}
            placeholder={ (ph && typeof ph === 'object') ? (ph.label || id) : id }
            style={{ width: '100%', padding: '10px', border: '1px solid #b3d4fc', borderRadius: 6, marginTop: 6, background: '#f5faff' }}
          />
        );
    }
  };

  return (
    <div style={{ padding: 15 }}>
      <h3 style={{ marginTop: 0, fontSize: 18, color: "#1976d2" }}>
        Graphics Template
      </h3>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 500, display: "block", marginBottom: 4 }}>
          Title:
        </label>
        <input
          type="text"
          value={localTemplateData.hasOwnProperty('title')
            ? localTemplateData.title
            : (itemData?.title || selectedItem?.title || "")}
          onChange={(e) => {
            setLocalTemplateData(prev => ({
              ...prev,
              title: e.target.value
            }));
          }}
          onBlur={(e) => handleTitleChange(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px"
          }}
          placeholder="Enter title for this graphics template"
        />
      </div>

      {/* Template selection */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 500, display: "block", marginBottom: 4 }}>
          Template Type
        </label>
        <select
          value={templateIdValue}
          onChange={handleTemplateChange}
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: 4,
          }}
        >
          <option value="">Select a template...</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        {selectedTemplate?.description && (
          <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
            {selectedTemplate.description}
          </div>
        )}
      </div>

      {/* Channel selection */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 500, display: "block", marginBottom: 4 }}>
          Output Channel
        </label>
        <select
          value={selectedChannel}
          onChange={handleChannelChange}
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: 4,
          }}
          disabled={isLoading}
        >
          {[1, 2, 3, 4].map((channel) => (
            <option key={channel} value={channel}>
              Channel {channel}
            </option>
          ))}
        </select>
        <div style={{ marginTop: 10 }}>
          <label style={{ fontWeight: 500, display: "block", marginBottom: 4 }}>
            Output Layer
          </label>
          <select
            value={selectedLayer}
            onChange={handleLayerChange}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: 4,
            }}
            disabled={isLoading}
          >
            {[1,2,3,4,5,6,7,8,9,10].map((layer) => (
              <option key={layer} value={layer}>
                Layer {layer}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedTemplate && placeholders.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h4 style={{
            marginTop: 0,
            marginBottom: 12,
            fontSize: 16,
            color: "#0b5394"
          }}>
            Template Placeholders
          </h4>
          <div style={{
            borderLeft: "4px solid #1976d2",
            background: "#eef6ff",
            padding: "12px",
            borderRadius: 6,
            display: "flex",
            flexDirection: "column",
            gap: 12
          }}>
            {isLoadingPlaceholders ? (
              <div style={{ fontSize: 13, color: "#666" }}>Loading placeholders…</div>
            ) : (
              placeholders.map(ph => {
                const key = (ph && typeof ph === 'object') ? ph.id : String(ph);
                const label = (ph && typeof ph === 'object') ? (ph.label || ph.id) : String(ph);
                return (
                  <div key={key}>
                    <label style={{ fontWeight: 600, display: "block" }}>
                      {label}
                    </label>
                    {renderPlaceholderInput(ph)}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {selectedTemplate && (
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>
            Template Parameters
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(selectedTemplate.parameters || []).map((param) => (
              <div key={param.id}>
                <label style={{ fontWeight: 500, display: "block" }}>
                  {param.info || param.id}
                </label>
                {renderParameterInput(param)}
              </div>
            ))}
          </div>
        </div>
      )}

      {previewUrl && (
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>
            Preview
          </h4>
          <div
            style={{
              width: "100%",
              aspectRatio: "16/9",
              background: "#000",
              border: "1px solid #ddd",
              borderRadius: 4,
              overflow: "hidden",
              position: "relative",
              height: "auto",
              cursor: "pointer",
              userSelect: "none",
            }}
            onMouseDown={handlePreviewMouseDown}
            title="Hold to preview"
          >
            <iframe
              ref={previewRef}
              src={previewUrl}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                display: "block",
                pointerEvents: "none",
              }}
              title="Template Preview"
              onLoad={() => {
                if (previewRef.current && templateData.templateId) {
                  setTimeout(() => {
                    const withFrame = {
                      ...templateData,
                      frame: templateData.frame || (baseDims && placeholderRect ? {
                        base: { width: Number(baseDims.width)||0, height: Number(baseDims.height)||0 },
                        rect: { x: Number(placeholderRect.x)||0, y: Number(placeholderRect.y)||0, width: Number(placeholderRect.width)||0, height: Number(placeholderRect.height)||0 },
                        fit: fitMode || 'contain'
                      } : undefined)
                    };
                    previewRef.current.contentWindow.postMessage(withFrame, "*");
                    console.log('Preview updated');
                  }, 100);
                }
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                background: "rgba(0,0,0,0.7)",
                color: "white",
                padding: "4px 8px",
                borderRadius: 4,
                fontSize: 12,
                opacity: 0.8,
              }}
            >
              🔍 Hold to preview
            </div>
          </div>
        </div>
      )}

      {selectedTemplate && (
        <div style={{ marginTop: 20 }}>
          <h4 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>
            Playback Controls
          </h4>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => handleCommand("play")}
              style={{
                flex: 1,
                padding: "8px 16px",
                background: "#4caf50",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontWeight: 500,
              }}
              disabled={isLoading || !templateData.templateId}
            >
              Play
            </button>
            <button
              onClick={() => handleCommand("update")}
              style={{
                flex: 1,
                padding: "8px 16px",
                background: "#2196f3",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontWeight: 500,
              }}
              disabled={isLoading || !templateData.templateId}
            >
              Update
            </button>
            <button
              onClick={() => handleCommand("stop")}
              style={{
                flex: 1,
                padding: "8px 16px",
                background: "#f44336",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontWeight: 500,
              }}
              disabled={isLoading || !templateData.templateId}
            >
              Stop
            </button>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
            Channel {selectedChannel} • Layer {selectedLayer}
            {templateData.templateId ? ` • ${templateData.templateId}` : ""}
            {isLoading ? " • Working…" : ""}
          </div>
          {templateData.lastCommand && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
              Last command: {templateData.lastCommand} at{" "}
              {new Date(templateData.lastCommandTime).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: "8px 12px",
            background: "#ffebee",
            color: "#c62828",
            borderRadius: 4,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {showPreviewPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: 20,
          }}
          onClick={() => setShowPreviewPopup(false)}
        >
          <div
            style={{
              position: "relative",
              width: "90vw",
              maxWidth: "1200px",
              aspectRatio: "16/9",
              background: "#000",
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={previewUrl}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                display: "block"
              }}
              title="Template Preview - Enlarged"
              onLoad={(e) => {
                if (templateData.templateId) {
                  setTimeout(() => {
                    const withFrame = {
                      ...templateData,
                      frame: templateData.frame || (baseDims && placeholderRect ? {
                        base: { width: Number(baseDims.width)||0, height: Number(baseDims.height)||0 },
                        rect: { x: Number(placeholderRect.x)||0, y: Number(placeholderRect.y)||0, width: Number(placeholderRect.width)||0, height: Number(placeholderRect.height)||0 },
                        fit: fitMode || 'contain'
                      } : undefined)
                    };
                    e.target.contentWindow.postMessage(withFrame, "*");
                  }, 100);
                }
              }}
            />

            <div
              style={{
                position: "absolute",
                bottom: 10,
                left: 10,
                background: "rgba(0,0,0,0.7)",
                color: "white",
                padding: "8px 12px",
                borderRadius: 4,
                fontSize: 12,
                opacity: 0.9,
              }}
            >
              {selectedTemplate?.name} - Channel {selectedChannel} • Release to close
            </div>

            <button
              onClick={() => setShowPreviewPopup(false)}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                background: "rgba(0,0,0,0.7)",
                color: "white",
                border: "none",
                borderRadius: 4,
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: 12,
                zIndex: 10001,
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}