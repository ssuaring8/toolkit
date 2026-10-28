# Gemini Copilot

An experimental Manifest V3 extension for Brave and Chrome. Read up to eight selected tabs concurrently, prepare a contextual prompt in the signed-in Gemini web app, import its latest response, and open links. No API key, backend, telemetry, or subscription of its own.

## Install unpacked
1. Download or clone this repository and extract it if zipped.
2. Open `brave://extensions` (Chrome: `chrome://extensions`). Enable **Developer mode**.
3. Choose **Load unpacked** and select the directory containing `manifest.json`.
4. Pin Gemini Copilot and click its icon to open the side panel.
5. Click **Open Gemini**, sign into Google yourself, and choose the model available to your account.
6. Return to your browsing window, refresh the tab list, select pages, and click **Read selected tabs**. Grant site access when requested.
7. Type your request and click **Prepare in Gemini**. Review the prompt in Gemini and press **Send**. Once Gemini finishes, click **Read latest reply** in the panel.

If filling Gemini fails, expand the prompt preview, copy it, and paste it into Gemini manually. The prompt preview is available even when the bridge fails.

## What works and limits
- Context and chat stay in panel memory until the panel closes. There is no extension server or persistent conversation store.
- Reading a tab requires optional permission for its site. Revoke permissions through the browser extension settings. Only explicitly selected tabs are captured; no automatic background collection.
- Snapshots contain main-page DOM text (up to 12,000 characters per page) and up to 60 visible links. Editable fields are excluded, but other personal information on selected pages may still be included. Review the prompt before sending it to Google.
- Main-document DOM only: no iframe, closed shadow-root, PDF, browser internal-page, or screenshot extraction. Dynamically hidden text may remain in snapshots.
- Uses the model and plan you select in Gemini. Cannot detect or upgrade your tier, unlock paid models, bypass quotas, log you in, or guarantee Gemini will accept automation.
- Gemini's DOM is unofficial and can change. The extension does not automatically send prompts or execute model-generated actions. Navigation is explicit through the URL field. The experimental Page actions section supports explicit CSS-selector clicks, text fills, and scrolling, with confirmation for every action. Automatic action planning and multi-step execution are future work.
- Latest reply means the latest response in the selected Gemini tab, not necessarily a response to this extension's prompt. Keep one Gemini chat open for predictable results.
- Google processes any content you send under its own terms and privacy policy. This is an independent project, not affiliated with Google or Brave.

## Development
Node 24+ and Chromium/Brave 116+. No install or build needed: all extension assets are local JavaScript, HTML, and CSS. Run `npm test`. Load the root directory as the unpacked extension after edits and click Reload in extensions settings. For the authenticated integration test, follow the installation walkthrough with your own Google session; never put login credentials into source or tests.
