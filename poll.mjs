import { EventEmitter } from 'events';
import { loadData } from './storage.mjs';

// Export to posts
export const cascadeEvents = new EventEmitter();

export function startPolling() {
  checkWarframeAPI();
}

async function checkWarframeAPI() {
  console.log("=== CRON TOCK: Checking Community Proxy API ===");
  const db = loadData();
  const nowSecs = Math.floor(Date.now() / 1000);
  
  // Poller
  const timeToWaitMs = 60000; 

  try {
    // Calling the community fissures endpoint directly
    const response = await fetch("https://api.warframestat.us/pc/fissures", {
      headers: { "User-Agent": "Cephalon-Slowbot/6.0 (Modularized)" }
    });

    if (!response.ok) {
      console.error(`Community Proxy Error: ${response.status}`);
      setTimeout(checkWarframeAPI, timeToWaitMs);
      return;
    }

    const fissures = await response.json();
    
    // The proxy uses standard string names instead of raw DE node keys
    const rawTarget = fissures.find(m => 
      m.node.includes("Tuvul Commons") && 
      m.missionType === "Void Cascade" &&
      m.isHard === true
    );

    if (rawTarget) {
      const targetId = rawTarget.id;
      // Convert standard ISO date string to seconds
      const targetExpirySecs = Math.floor(new Date(rawTarget.expiry).getTime() / 1000);

      // Avoids ghost cascades
      if ((targetExpirySecs - nowSecs) > 300) {
        if (!db.activeCascade || targetId !== db.activeCascade.id) {
          console.log("Cascade detected! Emitting 'newCascade' event.");
          
          cascadeEvents.emit('newCascade', {
            id: targetId,
            expiry: targetExpirySecs,
            node: "Tuvul Commons (Zariman)"
          });
        }
      }
    } else {
      console.log("No active cascades.");
      
      // Cleanup trigger
      if (db.activeCascade && db.activeCascade.expiry <= nowSecs) {
        cascadeEvents.emit('cascadeExpired', db.activeCascade);
      }
    }
  } catch (e) {
    console.error("Critical Fetch Error:", e);
  }

  // Recursive Scheduling
  setTimeout(checkWarframeAPI, timeToWaitMs);
}
