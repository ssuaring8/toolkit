# Gemini Copilot

An experimental Manifest V3 extension for Brave and Chrome. Read up to eight selected tabs concurrently, prompt Gemini to create a browser action plan, navigate tabs, and optionally add Confluence results from a Streamable HTTP MCP server. No Gemini API key, backend, telemetry, or subscription of its own.

## Install unpacked
1. Download or clone this repository and extract it if zipped.
2. Open `brave://extensions` (Chrome: `chrome://extensions`). Enable **Developer mode**.
3. Choose **Load unpacked** and select the directory containing `manifest.json`.
4. Pin Gemini Copilot and click its icon to open the side panel.
5. Click **Choose Google account**, select the Google account you want, and choose the model available to that account in Gemini.
6. Select the pages Gemini should use and type the browser task.
7. Click **Prepare task in Gemini**. This reads the selected pages automatically. Review the prompt in Gemini and press **Send**.
8. Return to the side panel, click **Import Gemini response**, review the action plan, then click **Run reviewed actions**. Navigation runs directly; clicks and typing require confirmation.

The normal workflow has only three numbered sections. Manual navigation, CSS-selector actions, and Confluence MCP settings are collapsed under advanced controls.

## Confluence MCP
The extension can connect to a Streamable HTTP MCP endpoint. Enter the endpoint supplied by your company or MCP provider, grant host access, sign in to that server (or enter a short-lived bearer token), then connect and choose its Confluence search tool. The token stays only in the open side-panel JavaScript state and is not saved.

An MCP server is still required. Browser extensions cannot reuse ChatGPT's private MCP connection or discover a Confluence server automatically. The server must permit requests from a Chrome extension and expose `initialize`, `tools/list`, and `tools/call` over Streamable HTTP.

If filling Gemini fails, expand the prompt preview, copy it, and paste it into Gemini manually. The prompt preview is available even when the bridge fails.

## What works and limits
- Context and chat stay in panel memory until the panel closes. There is no extension server or persistent conversation store.
- Reading a tab requires optional permission for its site. Revoke permissions through the browser extension settings. Only explicitly selected tabs are captured; no automatic background collection.
- Snapshots contain main-page DOM text (up to 12,000 characters per page) and up to 60 visible links. Editable fields are excluded, but other personal information on selected pages may still be included. Review the prompt before sending it to Google.
- Main-document DOM only: no iframe, closed shadow-root, PDF, browser internal-page, or screenshot extraction. Dynamically hidden text may remain in snapshots.
- Uses the model and plan you select in Gemini. Cannot detect or upgrade your tier, unlock paid models, bypass quotas, log you in, or guarantee Gemini will accept automation.
- Gemini's DOM is unofficial and can change. The extension does not automatically send prompts. It can execute a validated `copilot-actions` plan with at most eight actions. URLs are restricted to HTTP(S), selectors must come from captured page controls, and clicks or typing require confirmation because they may submit forms, send messages, or purchase items.
- Latest reply means the latest response in the selected Gemini tab, not necessarily a response to this extension's prompt. Keep one Gemini chat open for predictable results.
- Google processes any content you send under its own terms and privacy policy. This is an independent project, not affiliated with Google or Brave.

## Development
Node 24+ and Chromium/Brave 116+. No install or build needed: all extension assets are local JavaScript, HTML, and CSS. Run `npm test`. Load the root directory as the unpacked extension after edits and click Reload in extensions settings. For the authenticated integration test, follow the installation walkthrough with your own Google session; never put login credentials into source or tests.
