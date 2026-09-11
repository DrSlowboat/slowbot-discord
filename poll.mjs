import { EventEmitter } from 'events';
import { loadData } from './storage.mjs';
import { fetch, ProxyAgent } from 'undici';

// Export to posts
export const cascadeEvents = new EventEmitter();
let proxyList = []; // Stores our dynamically fetched proxies

export function startPolling() {
  checkWarframeAPI();
}

async function fetchProxies() {
  try {
    console.log("Fetching new free proxies from ProxyScrape...");
    const res = await fetch("https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=all&ssl=all&anonymity=all");
    const text = await res.text();
    // Split plain text list by newlines and remove empty lines
    proxyList = text.split('\r\n').filter(p => p.trim() !== '');
    console.log(`Loaded ${proxyList.length} proxies.`);
  } catch (e) {
    console.error("Failed to fetch proxy list:", e.message);
  }
}

async function checkWarframeAPI() {
  console.log("Checking DE API");
  const db = loadData();
  const nowSecs = Math.floor(Date.now() / 1000);
  
  // Poller interval
  const timeToWaitMs = 60000; 

  // Grab fresh proxies if we've run out
  if (proxyList.length === 0) {
    await fetchProxies();
  }

  let worldState = null;
  let success = false;

  // Retry loop: keep trying while we have proxies and haven't succeeded
  while (proxyList.length > 0 && !success) {
    const currentProxy = proxyList[0]; 
    
    try {
      const fetchOptions = {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json"
        },
        dispatcher: new ProxyAgent(`http://${currentProxy}`),
        signal: AbortSignal.timeout(5000) // 5-second hard limit for dead proxies
      };

      const response = await fetch("https://api.warframe.com/cdn/worldState.php", fetchOptions);

      if (!response.ok) {
        throw new Error(`DE API HTTP ${response.status}`);
      }

      worldState = await response.json();
      success = true; // Break the loop

    } catch (e) {
      console.log(`Proxy ${currentProxy} failed (${e.message}). Removing and trying next...`);
      proxyList.shift(); // Remove the bad proxy from the top of the list
    }
  }

  // If the loop succeeded, process the data exactly as before
  if (success && worldState) {
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
          console.log("Cascade detected. Posting 'newCascade'.");
          
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
  } else {
    console.error("Critical Fetch Error: All proxies exhausted or unable to reach API.");
  }

  // Recursive Scheduling
  setTimeout(checkWarframeAPI, timeToWaitMs);
}
