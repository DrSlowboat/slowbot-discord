# Slowbot

<img align="right" src="Slowbot.png" width="200" alt="Slowbot Logo">

Slowbot is a cross-server and platform Warframe LFG and alert bot for Steel Path Void Cascade Fissures. It monitors DE's API to detect active Steel Path Void Cascades and sends a notification when they pop up to every server it's invited to. The message will stay up for the duration of the cascade and give members of your server the option to "board". Once they select this, they'll be prompted to input their IGN and be assigned to a squad alongside everyone else who's done the same, regardless of which server they boarded from. All that's left is to send an in-game whisper, send out the invites, roll tile (if that's your thing) and get cascading!

## Features

* **Global LFG Pool:** Create a squad in one server, and it instantly updates the embed in every other server in the network.
* **Fissure Detection:** It checks and filters the DE API for Steel Path Zariman Fissures.
* **Intelligent Host Selection:** It uses a matrix to identify who the ideal host is for a cascade based on global network topology to minimise ping-related issues, since Warframe is P2P.
* **Automatic Pings for Full Squads:** It will notify squad members in *specifically* the server they boarded in about who their squad is and its suggested host the second the squad fills up. 
* **Automatic Message Deletion:** Once a cascade fissure expires, the bot will automatically delete its message to ensure the channel stays as clean as possible, preserving your guide's visibility at all times.

## Setup

Once you've invited Slowbot (or any of its iterations) to your server, you'll need to get it set up. 

1. Decide which channel you'd like it to post cascade notifications in. Make sure to add the bot to this channel, it will not automatically add itself to any channels because I have programmed it to be as unintrusive as possible. It will not read, message or add itself to channels you haven't manually added it to. 
2. Type `/guide` if you'd like it to inform people how to use the bot, how to make sure they're ready for a cascade, and ensure that they know what to expect upon clicking board. 
   * *The guide is specifically tailored to my personal beliefs about the way the bot should function. If you'd like to preview what it will post, click on the `GUIDE.md` file in this repository. If you are unhappy with it in any way, feel free to write rules that better suit your community. If you've forked this repository to create your own instance of the bot, you can edit the guide output in the `commands.mjs` file to have your instance of the bot post it instead.*
2. Use the `/setup` command to ensure that the bot will post to the channel you've selected, and select which roles, if any, you'd like it to ping.
3. Wait for a fissure to pop, squad up, and get cascading!

## Creating your own version of this app

The Discord-specific instance of Slowbot is hosted by me and is meant as a way for my alliance to cascade together. It isn't meant as a global LFG tool, but rather to team up with people I know and play with without having to worry about being in the same servers at the same time or pinging multiple channels.

However, I am firmly against elitism and have no intention of making this bot exclusive to servers within my alliance. Its purpose is to encourage cooperation across the entire Warframe community, and get people into my favourite game mode: Void Cascade.

To create your own version of this app, I've detailed the steps below:

### Create a Discord App

To start off with, you're going to need to create a Discord app through their [Developer Platform](https://discord.com/developers/applications/). Once you're in, name the bot what you'd like, give it a description, and get to work on the following: 

1. Ignore your public key (this won't be relevant for deploying the bot).
2. Note down your **Application ID**.
3. Navigate to the **Bot** panel, click on reset token, authenticate, and note down your token. **Do not share this token with anyone.**
> **Note:** If this token appears in an unencrypted form anywhere online, the best-case scenario is Discord immediately killing your version of the bot. The worst case is someone hijacking it and, because of the permissions it requires, completely destroying your server.
4. To set the bot to private, go to Installation, disable User Install (to make it Guild Install only), and set the install link to None (we'll be generating our own).
5. Skip OAuth2 for now (you don't actually need to do this, it's just more intuitive) and head over to the Bot tab. Disable the Public Bot setting and save your changes.
6. Navigate to OAuth2 and in the OAuth2 URL generator, grant it the following privileges: `applications.commands` (required for server-specific setup) and `bot` (required for functionality).
7. Grant the bot the following permissions: 
   * **View Channels & Read Message History:** This is how the bot is able to sync itself across servers.
   * **Send Messages & Embed Links:** This is how the bot posts and edits the Fissure LFG embed.
   * **Mention Everyone:** This is because the `/setup` command gives admins the option to select a role to ping when a cascade pops up. If you do not want your version of the bot to be able to ping people, this is optional. 
> **Note:** I have tried to make sure it requires the fewest permissions possible to ensure security, though bear in mind that being able to embed links, send messages, and mention people still carries risk. I cannot emphasise enough how important it is to keep your token private.
8. Note down your OAuth2 link; this is what you'll distribute to other servers to make them a part of your version of the bot's LFG network.

### Create a Fork of This Repository for your Personal Use

1. Fork the repo, then fetch it to the location of your choice.
2. Navigate to the directory in your terminal and run 'npm install'.

This will automatically read the \`package.json\` and install the necessary packages.
*   **discord.js:** The core library for interacting with the Discord API.
*   **mongodb:** The official driver for connecting the bot to a MongoDB Atlas database.
*   **undici:** Used for the ProxyAgent to bypass API firewalls during polling.

### Create an account on MongoDB

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas) and create a free account.
2. Deploy a **Free M0 Cluster**.
3. Under **Database Access**, create a new database user and save the password.
4. Under **Network Access**, add the IP 0.0.0.0 so your cloud host can connect to it.
5. Click **Connect**, select **Drivers** (Node.js), and copy your connection string. 
6. Replace 'password' in the string with your database user password and save this for later, you'll be using this in your Variables in the next step.

### Host Your Own Instance

You will need to host this bot on a Virtual Private Server (VPS) so it runs 24/7. My personal choice is Northflank, though Railway and Koyeb are also great options and this bot is pre-configured to work with those.

#### Northflank Setup Guide

To create your own version of this app on Northflank:

1. Fork this repository.
2. Go to [Northflank](https://app.northflank.com) and sign in with GitHub.
3. Click **New Project** -> **Deploy from GitHub repo** -> Select your fork.
4. Go to the **Variables** tab in your Northflank project and add the following:
   * `TOKEN`: Your Discord Bot Token (the token you generated)
   * `CLIENT_ID`: Your Discord Bot Client ID (The Application ID)
   * `MONGO_URI`: This is the MongoDB where your bot's server, channel and role list will be stored.
   * `PROXY_URL`: This is in case your Proxy fails to poll the Warframe API. Just change the proxy URL here (look for elite proxies that are https and google accessible on your free proxy website of choice.)
5. Once that's done, Northflank will take care of the rest. You're good to go! 

### How to Install The Bot on your Server

Once the bot is deployed on the VPS of your choice, all that's left to do is install it. Click the OAuth2 link you generated earlier to add it to your server. Use the `/guide` and `/setup` commands as an administrator of the server in a text/announcements channel. 

And that's it! Your iteration of Slowbot is up and running! Go turn some thrax into prime parts and arcanes! 

This project is fully open source under the MIT license, so as long as you have the license file in your fork, you're free to do with it what you will. While I would really appreciate being credited in your app description, you're under no compulsion to do so.

---

## Support/Receive Updates on the Project

If you'd like to track, test, provide feedback, or contribute to the bot's functionality, you can find out more about it in my discord:
<br><br><a href="https://discord.gg/yctkNhnbeH">
    <img title="" src="https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/66e3d74e9607e61eeec9c91b_Logo.svg" alt="Discord">
</a><br>

If Slowbot helped you make good use of your mod drop chance booster, any donation towards my caffeine addiction, further project development, streams/YouTube, and/or getting me to TennoCon would be much appreciated! 
<br><br><a href="https://ko-fi.com/MrSlowboat">
  <img src="DrSlowboat.png" width="150" alt="DrSlowboat">
</a><br>
<a href="https://ko-fi.com/MrSlowboat">
  <img title="" src="https://cdn.prod.website-files.com/5c14e387dab576fe667689cf/670f5a0172b90570b1c21dab_kofi_logo.png" alt="Ko-Fi" width="131">
</a><br>

May your RNG be better than mine! See you around, Tenno!
