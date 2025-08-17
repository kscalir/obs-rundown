// =============================================
// /src/dnd/useRundownDnD.js
// Consolidated DnD handlers. No inline DB logic in component.
// =============================================
import { useCallback, useRef } from "react";
import { toast } from "react-toastify";

// tiny debounce
function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function useRundownDnD({ api, segments, setSegments, selectedEpisode }) {
  const idEq = (a, b) => String(a) === String(b);
  const reorder = (list, startIdx, endIdx) => {
    const next = [...list];
    const [removed] = next.splice(startIdx, 1);
    next.splice(endIdx, 0, removed);
    return next;
  };

  // debounced flushers (stable across renders)
  const flushSegments = useRef(
    debounce(async (ordered) => {
      try {
        await Promise.all(ordered.map((s, i) =>
          api.patch(`/api/segments/${s.id}`, { position: i })
        ));
      } catch (e) {
        console.warn("[flushSegments]", e);
      }
    }, 400)
  ).current;

  const flushGroups = useRef(
    debounce(async (segment) => {
      try {
        const groups = segment?.groups || [];
        await Promise.all(groups.map((g, i) =>
          api.patch(`/api/groups/${g.id}`, { position: i })
        ));
      } catch (e) {
        console.warn("[flushGroups]", e);
      }
    }, 400)
  ).current;

  const flushItems = useRef(
    debounce(async (group) => {
      try {
        const items = group?.items || [];
        await Promise.all(items.map((it, i) =>
          api.patch(`/api/items/${it.id}`, { position: i })
        ));
      } catch (e) {
        console.warn("[flushItems]", e);
      }
    }, 400)
  ).current;

  const handleDragStart = useCallback(() => {}, []);

  const handleDragEnd = useCallback(async (result) => {
    const { source, destination, draggableId, type } = result || {};
    if (!destination) return;

    // SEGMENTS: reorder
    if (type === "segment") {
      const next = reorder(segments, source.index, destination.index);
      setSegments(next);
      flushSegments(next);
      return;
    }

    // GROUPS: reorder within same segment
    if (type === "group" && source.droppableId === destination.droppableId) {
      const segId = source.droppableId.split("-")[1];
      const next = segments.map(seg => {
        if (!idEq(seg.id, segId)) return seg;
        const groups = reorder(seg.groups || [], source.index, destination.index);
        return { ...seg, groups };
      });
      setSegments(next);
      const updatedSeg = next.find(s => idEq(s.id, segId));
      flushGroups(updatedSeg);
      return;
    }

    // GROUPS: move between segments
if (
  type === "group" &&
  source.droppableId.startsWith("groups-") &&
  destination.droppableId.startsWith("groups-") &&
  source.droppableId !== destination.droppableId
) {
  const srcSegId = source.droppableId.split("-")[1];
  const dstSegId = destination.droppableId.split("-")[1];

  // 1) remove from source segment
  let movedGroup;
  const afterRemoval = segments.map(seg => {
    if (idEq(seg.id, srcSegId)) {
      const groups = [...(seg.groups || [])];
      [movedGroup] = groups.splice(source.index, 1);
      return { ...seg, groups };
    }
    return seg;
  });

  // 2) insert into destination segment at drop index
  const next = afterRemoval.map(seg => {
    if (idEq(seg.id, dstSegId)) {
      const groups = [...(seg.groups || [])];
      groups.splice(destination.index, 0, movedGroup);
      return { ...seg, groups };
    }
    return seg;
  });

  setSegments(next);

  // 3) persist move (segment_id + position), then debounce reindex for both segments
  try {
    await api.patch(`/api/groups/${movedGroup.id}`, {
      segment_id: Number(dstSegId),
      position: destination.index
    });
  } catch (e) {
    console.warn("[move group]", e);
  }

  const srcSeg = next.find(s => idEq(s.id, srcSegId));
  const dstSeg = next.find(s => idEq(s.id, dstSegId));
  flushGroups(srcSeg);  // debounced: reindex source groups
  flushGroups(dstSeg);  // debounced: reindex destination groups
  return;
}

    // TOOLBOX → MANUAL BLOCK: Add items to Manual Block (check this BEFORE regular toolbox → group)
    if ((source.droppableId === "toolbox" || source.droppableId === "obs-scenes") && destination.droppableId.startsWith("manual-block-")) {
      const manualBlockItemId = destination.droppableId.replace("manual-block-", "");
      
      // Handle new draggableId format: "toolbox:item:id" or "toolbox:scene:id"
      const parts = draggableId.includes(":") ? draggableId.split(":") : draggableId.split("-");
      const isObsScene = (parts.length >= 3 && parts[1] === "scene") || parts[1] === "obsscene";
      
      // Handle new FullScreen toolbox items
      const isFullScreenType = parts.length >= 3 && parts[1] === "item" && 
        (parts[2] === "fullscreen-graphic" || 
         parts[2] === "fullscreen-video" || 
         parts[2] === "fullscreen-youtube" || 
         parts[2] === "fullscreen-pdfimage");
      
      let moduleType, title, data;
      
      // Generate same item data as regular toolbox drops
      if (isObsScene) {
        moduleType = "obscommand";
        const sceneName = parts.length >= 4 && parts[1] === "scene" && parts[2] === "name"
          ? parts.slice(3).join(":") // Get everything after "name" part
          : parts.length >= 3 && parts[1] === "scene" 
          ? parts[2].replace(/^name:/, '') 
          : parts.slice(2).join("-");
        title = `Switch to Scene: ${sceneName}`;
        data = { command: "SetCurrentProgramScene", parameters: { sceneName } };
      } else if (isFullScreenType) {
        const itemTypeMap = {
          'fullscreen-graphic': 'FullScreenGraphic',
          'fullscreen-video': 'FullScreenVideo', 
          'fullscreen-youtube': 'FullScreenYouTube',
          'fullscreen-pdfimage': 'FullScreenPdfImage'
        };
        moduleType = itemTypeMap[parts[2]] || 'FullScreenGraphic';
        const typeDisplayNames = {
          'FullScreenGraphic': 'Graphic',
          'FullScreenVideo': 'Video', 
          'FullScreenYouTube': 'YouTube',
          'FullScreenPdfImage': 'PDF/Image'
        };
        title = typeDisplayNames[moduleType] || `New ${moduleType}`;
        data = {
          transition: { type: "cut", durationSec: 0 },
          notes: ""
        };
      } else if (parts.length >= 3 && parts[1] === "item" && parts[2] === "audio-cue") {
        moduleType = "audio-cue";
        title = "Audio Cue";
        data = {
          audioSource: "",
          on: true,
          level: 100,
          fade: false,
          fadeDuration: 1.0
        };
      } else if (parts.length >= 3 && parts[1] === "item" && parts[2] === "presenter-note") {
        moduleType = "presenter-note";
        title = "Presenter Note";
        data = {
          note: ""
        };
      } else {
        // Prevent Manual Blocks from being nested in Manual Blocks
        if (parts.length >= 3 && parts[1] === "item" && parts[2] === "manual-block") {
          toast.warning("Cannot nest Manual Blocks inside other Manual Blocks", {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          return;
        }
        
        // Legacy handling for other toolbox items
        moduleType = parts.length >= 3 ? parts[2] : parts[1];
        title = `New ${moduleType}`;
        data = {};
      }

      try {
        // Create the item object (without saving to database)
        const newItem = {
          id: `temp-${Date.now()}-${Math.random()}`, // Temporary ID
          type: moduleType,
          title,
          data
        };

        // Add the item to the Manual Block's items array
        setTimeout(() => {
          setSegments(prevSegments => {
            return prevSegments.map(seg => {
              return {
                ...seg,
                groups: (seg.groups || []).map(g => {
                  return {
                    ...g,
                    items: (g.items || []).map(item => {
                      if (String(item.id) === String(manualBlockItemId)) {
                        // This is the Manual Block - add the new item to its data.items
                        const currentItems = item.data?.items || [];
                        const updatedItems = [...currentItems, newItem];
                        const updatedData = { ...item.data, items: updatedItems };
                        
                        // Save the updated Manual Block to database
                        api.patch(`/api/items/${item.id}`, { data: updatedData }).catch(e => {
                          console.warn("[update manual block]", e);
                        });
                        
                        return { ...item, data: updatedData };
                      }
                      return item;
                    })
                  };
                })
              };
            });
          });
        }, 0);
        
      } catch (e) {
        console.warn("[add to manual block]", e);
      }
      return;
    }

    // ITEMS: created from toolbox → group
    if ((source.droppableId === "toolbox" || source.droppableId === "obs-scenes") && destination.droppableId.startsWith("items-")) {
      const [, segId, groupId] = destination.droppableId.split("-");
      
      // Handle new draggableId format: "toolbox:item:id" or "toolbox:scene:id"
      const parts = draggableId.includes(":") ? draggableId.split(":") : draggableId.split("-");
      const isObsScene = (parts.length >= 3 && parts[1] === "scene") || parts[1] === "obsscene";
      
      // Handle new FullScreen toolbox items
      const isFullScreenType = parts.length >= 3 && parts[1] === "item" && 
        (parts[2] === "fullscreen-graphic" || 
         parts[2] === "fullscreen-video" || 
         parts[2] === "fullscreen-youtube" || 
         parts[2] === "fullscreen-pdfimage");
      
      let moduleType, title, data;
      
      if (isObsScene) {
        moduleType = "obscommand";
        // Handle both old format (toolbox-obsscene-SceneName) and new format (toolbox:scene:sceneKey)
        const sceneName = parts.length >= 4 && parts[1] === "scene" && parts[2] === "name"
          ? parts.slice(3).join(":") // Get everything after "name" part
          : parts.length >= 3 && parts[1] === "scene" 
          ? parts[2].replace(/^name:/, '') // Remove "name:" prefix if present
          : parts.slice(2).join("-"); // Legacy format
        title = `Switch to Scene: ${sceneName}`;
        data = { command: "SetCurrentProgramScene", parameters: { sceneName } };
      } else if (isFullScreenType) {
        // Map the item IDs to module types
        const itemTypeMap = {
          'fullscreen-graphic': 'FullScreenGraphic',
          'fullscreen-video': 'FullScreenVideo', 
          'fullscreen-youtube': 'FullScreenYouTube',
          'fullscreen-pdfimage': 'FullScreenPdfImage'
        };
        moduleType = itemTypeMap[parts[2]] || 'FullScreenGraphic';
        const typeDisplayNames = {
          'FullScreenGraphic': 'Graphic',
          'FullScreenVideo': 'Video', 
          'FullScreenYouTube': 'YouTube',
          'FullScreenPdfImage': 'PDF/Image'
        };
        title = typeDisplayNames[moduleType] || `New ${moduleType}`;
        data = {
          transition: { type: "cut", durationSec: 0 },
          notes: ""
        };
      } else if (parts.length >= 3 && parts[1] === "item" && parts[2] === "manual-block") {
        // Handle Manual Block
        moduleType = "manual-block";
        title = "Manual Cue Block";
        data = {
          transition: { type: "cut", durationSec: 0 },
          items: []
        };
      } else if (parts.length >= 3 && parts[1] === "item" && parts[2] === "audio-cue") {
        // Handle Audio Cue
        moduleType = "audio-cue";
        title = "Audio Cue";
        data = {
          audioSource: "",
          on: true,
          level: 100,
          fade: false,
          fadeDuration: 1.0
        };
      } else if (parts.length >= 3 && parts[1] === "item" && parts[2] === "presenter-note") {
        // Handle Presenter Note
        moduleType = "presenter-note";
        title = "Presenter Note";
        data = {
          note: ""
        };
      } else {
        // Legacy handling for other toolbox items
        moduleType = parts.length >= 3 ? parts[2] : parts[1];
        title = `New ${moduleType}`;
        data = {};
      }

      try {
        // Add default automation values
        const itemPayload = {
          type: moduleType,
          group_id: Number(groupId),
          position: destination.index,
          title,
          data,
          automation_mode: 'manual',  // Default to manual mode
          automation_duration: 10,     // Default 10 seconds
          use_media_duration: false    // Default to not using media duration
        };
        
        const created = await api.post(`/api/items`, itemPayload);

        const normalized = {
          ...created,
          data: (created && typeof created.data === "string")
            ? (() => { try { return JSON.parse(created.data); } catch { return {}; } })()
            : created?.data || {}
        };

        // Delay state update until after drag operation completes
        // This prevents the "attempting to add Draggable while drag is occurring" error
        setTimeout(() => {
          let updatedSeg, updatedGrp;
          setSegments(prevSegments => {
            const next = prevSegments.map(seg => {
              if (!idEq(seg.id, segId)) return seg;
              return {
                ...seg,
                groups: (seg.groups || []).map(g => {
                  if (!idEq(g.id, groupId)) return g;
                  const items = [...(g.items || [])];
                  items.splice(destination.index, 0, normalized);
                  return { ...g, items };
                })
              };
            });
            
            // Cache the updated segment and group for flushing
            updatedSeg = next.find(s => idEq(s.id, segId));
            updatedGrp = updatedSeg?.groups.find(g => idEq(g.id, groupId));
            
            return next;
          });
          
          flushItems(updatedGrp);
        }, 0);
        
        // Toolbox drop completed successfully
      } catch (e) {
        console.warn("[create item]", e);
      }
      return;
    }


    // ITEMS: reorder within same group
    if (type === "item" && source.droppableId === destination.droppableId && source.droppableId.startsWith("items-")) {
      const [, segId, groupId] = source.droppableId.split("-");
      const next = segments.map(seg => {
        if (!idEq(seg.id, segId)) return seg;
        return {
          ...seg,
          groups: (seg.groups || []).map(g => {
            if (!idEq(g.id, groupId)) return g;
            return { ...g, items: reorder(g.items || [], source.index, destination.index) };
          })
        };
      });
      setSegments(next);
      const updatedSeg = next.find(s => idEq(s.id, segId));
      const updatedGrp = updatedSeg?.groups.find(g => idEq(g.id, groupId));
      flushItems(updatedGrp);
      return;
    }

    // ITEMS: move between groups (and maybe segments)
    if (type === "item"
      && source.droppableId.startsWith("items-")
      && destination.droppableId.startsWith("items-")
      && source.droppableId !== destination.droppableId) {

      const [, srcSegId, srcGroupId] = source.droppableId.split("-");
      const [, dstSegId, dstGroupId] = destination.droppableId.split("-");

      let moved;
      const removed = segments.map(seg => {
        if (idEq(seg.id, srcSegId)) {
          return {
            ...seg,
            groups: (seg.groups || []).map(g => {
              if (!idEq(g.id, srcGroupId)) return g;
              const items = [...(g.items || [])];
              [moved] = items.splice(source.index, 1);
              return { ...g, items };
            })
          };
        }
        return seg;
      });

      const next = removed.map(seg => {
        if (idEq(seg.id, dstSegId)) {
          return {
            ...seg,
            groups: (seg.groups || []).map(g => {
              if (!idEq(g.id, dstGroupId)) return g;
              const items = [...(g.items || [])];
              items.splice(destination.index, 0, moved);
              return { ...g, items };
            })
          };
        }
        return seg;
      });

      setSegments(next);

      // persist the move quickly; positions will be normalized by the debounced flushes
      try {
        await api.patch(`/api/items/${moved.id}`, {
          group_id: Number(dstGroupId),
          position: destination.index
        });
      } catch (e) {
        console.warn("[move item]", e);
      }

      const dstSeg = next.find(s => idEq(s.id, dstSegId));
      const srcSeg = next.find(s => idEq(s.id, srcSegId));
      const dstGrp = dstSeg?.groups.find(g => idEq(g.id, dstGroupId));
      const srcGrp = srcSeg?.groups.find(g => idEq(g.id, srcGroupId));

      flushItems(dstGrp);
      flushItems(srcGrp);
      return;
    }
  }, [segments, setSegments, api]);

  return { handleDragStart, handleDragEnd };
}