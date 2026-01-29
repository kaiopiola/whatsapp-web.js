# App State Synchronization and Message Event Fixes

This document describes the fixes implemented to resolve application state synchronization issues and message event triggering in whatsapp-web.js.

## Issue 1: Client not reaching READY state

### Description
The client would get stuck in "connecting" state (99%) and never fire the `ready` event, even after successful authentication.

### Root Cause
The listener for the `change:hasSynced` event from `AuthStore.AppState` was being registered after the state had already been synchronized (`hasSynced = true`). This created a race condition where the event would never be captured if it occurred before the listener was attached.

### Implemented Solution
**File:** `src/Client.js` (lines 287-297)

Implemented proactive state checking before registering listeners:

```javascript
const appState = window.AuthStore.AppState;

// Check if already synced before registering listener
if (appState.hasSynced) {
    window.onAppStateHasSyncedEvent();
}

// Register listener for future changes, checking the value
appState.on('change:hasSynced', (_AppState, hasSynced) => {
    if (hasSynced) {
        window.onAppStateHasSyncedEvent();
    }
});

appState.on('change:state', (_AppState, state) => {
    window.onAuthAppStateChangedEvent(state);
});
```

**Before:** The listener was registered without checking the current state
```javascript
window.AuthStore.AppState.on('change:hasSynced', () => {
    window.onAppStateHasSyncedEvent();
});
```

**After:** Checks current state AND registers listener for future changes

---

## Issue 2: Message events not firing

### Description
The `message` and `message_create` events were not being fired when messages were received, even with WhatsApp Web working correctly.

### Root Cause
In recent WhatsApp Web versions (2.3000.x+), the `msg.isNewMsg` property returns `undefined` for new messages instead of `true`. The original code checked `if (msg.isNewMsg)`, which evaluates to `false` for `undefined` values, causing all new messages to be rejected.

### Log Analysis
During investigation, it was observed that:
- **Message #1**: `isNewMsg: true` ✅ (first message after connection)
- **Messages #2-N**: `isNewMsg: undefined` ❌ (all subsequent messages)

### Implemented Solution
**File:** `src/Client.js`

#### Change 1: 'add' event listener (lines 771-785)

**Before:**
```javascript
window.Store.Msg.on('add', (msg) => {
    if (msg.isNewMsg) {
        // process message
    }
});
```

**After:**
```javascript
window.Store.Msg.on('add', (msg) => {
    // Check if msg.isNewMsg is true or undefined (not explicitly false)
    // In newer WhatsApp Web versions, isNewMsg can be undefined for new messages
    if (msg.isNewMsg !== false) {
        if(msg.type === 'ciphertext') {
            // defer message event until ciphertext is resolved (type changed)
            msg.once('change:type', (_msg) => window.onAddMessageEvent(window.WWebJS.getMessageModel(_msg)));
            if (window.onAddMessageCiphertextEvent) {
                window.onAddMessageCiphertextEvent(window.WWebJS.getMessageModel(msg));
            }
        } else {
            window.onAddMessageEvent(window.WWebJS.getMessageModel(msg));
        }
    }
});
```

#### Change 2: 'remove' event listener (line 763)

**Before:**
```javascript
window.Store.Msg.on('remove', (msg) => {
    if (msg.isNewMsg) window.onRemoveMessageEvent(window.WWebJS.getMessageModel(msg));
});
```

**After:**
```javascript
window.Store.Msg.on('remove', (msg) => {
    if (msg.isNewMsg !== false) window.onRemoveMessageEvent(window.WWebJS.getMessageModel(msg));
});
```

#### Change 3: onRemoveMessageEvent handler (line 563)

**Before:**
```javascript
await exposeFunctionIfAbsent(this.pupPage, 'onRemoveMessageEvent', (msg) => {
    if (!msg.isNewMsg) return;
    // ...
});
```

**After:**
```javascript
await exposeFunctionIfAbsent(this.pupPage, 'onRemoveMessageEvent', (msg) => {
    if (msg.isNewMsg === false) return;
    // ...
});
```

### Validation Logic

The change from `if (msg.isNewMsg)` to `if (msg.isNewMsg !== false)` accepts:
- ✅ `msg.isNewMsg = true` (explicit new messages)
- ✅ `msg.isNewMsg = undefined` (new messages in recent versions)
- ❌ `msg.isNewMsg = false` (old messages/cache)

---

## Compatibility

These fixes maintain backward compatibility with previous WhatsApp Web versions while supporting behavioral changes in the most recent versions (2.3000.x+).

## Impact

- ✅ Client reaches `ready` state correctly
- ✅ `message` and `message_create` events fire for all received messages
- ✅ `message_revoke_me` events continue working correctly
- ✅ Maintains compatibility with both old and new WhatsApp Web versions

## Tested on

- WhatsApp Web version: 2.3000.1032641640
- Node.js: >= 18.0.0
- Puppeteer: 24.31.0

## References

- READY state related issue: Race condition in AppState synchronization
- Message events related issue: `isNewMsg` property returning `undefined` in recent versions
