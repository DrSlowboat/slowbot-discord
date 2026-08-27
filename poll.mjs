import { EventEmitter } from 'events';
import { loadData } from './storage.mjs';
import { fetch, ProxyAgent } from 'undici';

// Export to posts
export const cascadeEvents = new EventEmitter();

export function startPolling() {
  checkWarframeAPI();
}

async function checkWarframeAPI() {
  console.log("Checking DE API");
  const db = loadData();
  const nowSecs = Math.floor(Date.now() / 1000);
  
  // Poller interval
  const timeToWaitMs = 60000; 

  try {
    const fetchOptions = {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
    };

    // Use ProxyAgent if PROXY_URL is configured in environment variables
    if (process.env.PROXY_URL) {
      fetchOptions.dispatcher = new ProxyAgent(process.env.PROXY_URL);
    }

    const response = await fetch("https://api.warframe.com/cdn/worldState.php", fetchOptions);

    if (!response.ok) {
      console.error(`DE API Error: ${response.status}`);
      setTimeout(checkWarframeAPI, timeToWaitMs);
      return;
    }

    const worldState = await response.json();
    
    const rawTarget = worldState.ActiveMissions.find(m => 
      m.Node === "SolNode232" && 
      m.MissionType === "MT_VOID_CASCADE" &&
      m.Hard === true
    );

    if (rawTarget) {
      const targetId = rawTarget._id.$oid;
      const targetExpirySecs = Math.floor(parseInt(rawTarget.Expiry.$date.$numberLong) / 1000);

      // Avoids ghost cascades
      if ((targetExpirySecs - nowSecs) > 300) {
        if (!db.activeCascade || targetId !== db.activeCascade.id) {
          console.log("Cascade detected. Emitting 'newCascade' event.");
          
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
