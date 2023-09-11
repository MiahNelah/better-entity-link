import {BetterDocumentLink} from "./BetterDocumentLink.js";

function renderImagePopup(image, title, uuid, shareable) {
    const imagePoput = new ImagePopout(image, {
        title: title,
        shareable: shareable,
        uuid: uuid
    });
    imagePoput.render(true);
}

async function showImage(uuid, title, type) {
    await game.socket.emit("showEntry", uuid, type, true, () => {
        Journal._showEntry(uuid, type, true);
        ui.notifications.info(game.i18n.format("JOURNAL.ActionShowSuccess", {
            mode: type,
            title: title,
            which: "all"
        }));
    });
}

function permissionHelper(obj, permissions) {
    // empty or invalid obj must NOT block condition
    if (!obj || !obj.permission) return true;
    if (!permissions || !(permissions instanceof Array) || permissions.length === 0) return true;
    return permissions.includes(obj.permission);
}

function safeSetInterval(condition, callback, delay, timeout) {
    let tracker = 0;
    const intervalId = setInterval(() => {
        if (condition()) {
            clearInterval(intervalId);
            return callback();
        }

        tracker += delay;
        if (tracker >= timeout)
            clearInterval(intervalId);
    }, delay);
}


function registerActorActions() {
    // Actor - "Select" button
    BetterDocumentLink.registerActorAction({
        name: "CONTROLS.CanvasSelect",
        icon: "fa-hand-pointer",
        condition: (uuid) => canvas.ready && canvas.tokens.placeables.some(x => x.actor.uuid.endsWith(uuid)),
        callback: async document => {
            if (!canvas.tokens.active) canvas.tokens.activate();
            canvas.tokens.releaseAll();
            document.getActiveTokens().forEach(x => x.control({releaseOthers: false}));
        }
    });

    // Actor - "Target" button
    BetterDocumentLink.registerActorAction({
        name: "CONTROLS.TargetSelect",
        icon: "fa-bullseye",
        condition: (uuid) => canvas.ready && canvas.tokens.placeables.some(x => x.actor.uuid.endsWith(uuid)),
        callback: async document => {
            if (!canvas.tokens.active) canvas.tokens.activate();
            document.getActiveTokens()
                .filter(token => !token.isTargeted)
                .forEach(token => token.setTarget(true, {releaseOthers: false}));
        }
    });

    // Actor - "Ping" button
    BetterDocumentLink.registerActorAction({
        name: "CONTROLS.CanvasPing",
        icon: "fa-map-pin",
        condition: (uuid) => canvas.ready && canvas.tokens.placeables.some(x => x.actor.uuid.endsWith(uuid)),
        callback: async document => Promise.all(document.getActiveTokens().map(async x => canvas.ping(x.center)))
    });

    // Actor - "Ping Alert" button
    BetterDocumentLink.registerActorAction({
        name: "CONTROLS.CanvasPingAlert",
        icon: "fa-map-pin",
        condition: (uuid) => canvas.ready && canvas.tokens.placeables.some(x => x.actor.uuid.endsWith(uuid)),
        callback: async document => Promise.all(document.getActiveTokens().map(async x => canvas.ping(x.center, {style: CONFIG.Canvas.pings.types.ALERT})))
    });

    // Actor - "Pull to Ping" button
    BetterDocumentLink.registerActorAction({
        name: "CONTROLS.CanvasPingPull",
        icon: "fa-map-pin",
        condition: (uuid) => canvas.ready && canvas.tokens.placeables.some(x => x.actor.uuid.endsWith(uuid)),
        callback: async document => Promise.all(document.getActiveTokens().map(async x => canvas.ping(x.center, {
            style: CONFIG.Canvas.pings.types.PULL,
            pull: true
        })))
    });

    // Actor - "Token Configuration" button
    BetterDocumentLink.registerActorAction({
        name: "TOKEN.Title",
        icon: "fa-user-circle",
        condition: (uuid, data) => data?.prototypeToken && (game.user.isGM || game.user.isTrusted || permissionHelper(data, [CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER])),
        callback: async document => new CONFIG.Token.prototypeSheetClass(document.prototypeToken).render(true)
    });

    // Actor - "View Character Artwork" button
    BetterDocumentLink.registerActorAction({
        name: "SIDEBAR.CharArt",
        icon: "fa-image",
        condition: (uuid, data) => data?.img && ![undefined, null, CONST.DEFAULT_TOKEN].includes(data?.img),
        callback: async document => renderImagePopup(document.img, document.name, document.uuid, true)
    });

    // Actor - "View Token Artwork" button
    BetterDocumentLink.registerActorAction({
        name: "SIDEBAR.TokenArt",
        icon: "fa-image",
        condition: (uuid, data) => data?.prototypeToken?.texture?.src && ![undefined, null, CONST.DEFAULT_TOKEN].includes(data?.prototypeToken.texture.src),
        callback: async document => renderImagePopup(document.prototypeToken.texture.src, document.name, document.uuid, true)
    });

    // Actor - "Configure Ownership" button
    BetterDocumentLink.registerActorAction({
        name: "OWNERSHIP.Configure",
        icon: "fa-lock fa-fw",
        condition: () => game.user.isGM || game.user.isTrusted,
        callback: async document => new DocumentOwnershipConfig(document).render(true)
    });
}

function registerItemActions() {
    // Item - "View Item Artwork" button
    BetterDocumentLink.registerItemAction({
        name: "ITEM.ViewArt",
        icon: "fa-image",
        condition: (uuid, data) => ![undefined, null, CONST.DEFAULT_TOKEN].includes(data?.img),
        callback: async document => renderImagePopup(document.img, document.name, document.uuid, true)
    });

    // Item - "View Item Artwork" button
    BetterDocumentLink.registerItemAction({
        name: "OWNERSHIP.OWNER",
        icon: "fa-crown",
        condition: (uuid, data) => data && data.isEmbedded && data.parent,
        callback: async document => document.parent.sheet.render(true)
    });

    // Item - "Configure Ownership" button
    BetterDocumentLink.registerItemAction({
        name: "OWNERSHIP.Configure",
        icon: "fa-lock fa-fw",
        condition: () => game.user.isGM || game.user.isTrusted,
        callback: async document => new DocumentOwnershipConfig(document).render(true)
    });
}

function registerSceneActions() {
    // Scene - "View" button
    BetterDocumentLink.registerSceneAction({
        name: "SCENES.View",
        icon: "fa-eye",
        condition: (uuid, data) => (game.user.isGM || game.user.isTrusted) && !data.isView,
        callback: async document => await document.view()
    });

    // Scene - "Activate" button
    BetterDocumentLink.registerSceneAction({
        name: "SCENES.Activate",
        icon: "fa-bullseye",
        condition: (uuid, data) => (game.user.isGM || game.user.isTrusted) && !data.active,
        callback: async document => await document.activate()
    });

    // Scene - "Preload" button
    BetterDocumentLink.registerSceneAction({
        name: "SCENES.Preload",
        icon: "fa-download",
        condition: (uuid, data) => (game.user.isGM || game.user.isTrusted),
        callback: async document => await game.scenes.preload(document.id)
    });
}

function registerJournalEntryActions() {
    // JournalEntry - "Show players (Text)" button
    BetterDocumentLink.registerJournalEntryAction({
        name: `${game.i18n.localize("JOURNAL.ActionShow")} (${game.i18n.localize("JOURNAL.ModeText")})`,
        icon: "fa-eye",
        condition: (uuid, data) => data?.img !== CONST.DEFAULT_TOKEN && (game.user.isGM || game.user.isTrusted),
        callback: async document => await showImage(document.uuid, document.name, "text")
    });

    // JournalEntry - "Show players (Image)" button
    BetterDocumentLink.registerJournalEntryAction({
        name: `${game.i18n.localize("JOURNAL.ActionShow")} (${game.i18n.localize("JOURNAL.ModeImage")})`,
        icon: "fa-eye",
        condition: (uuid, data) => data?.img !== CONST.DEFAULT_TOKEN && (game.user.isGM || game.user.isTrusted),
        callback: async document => await showImage(document.uuid, document.name, "image")
    });

    // JournalEntry - "Jump to Pin" button
    // If no pin is found in current scene, look up for pins in others scenes
    BetterDocumentLink.registerJournalEntryAction({
        name: "SIDEBAR.JumpPin",
        icon: "fa-crosshairs",
        condition: (uuid, data) => data.sceneNote ? true
            : game.scenes.filter(s => s.notes.filter(x => x.entryId === data.id).length > 0).length > 0,
        callback: async document => {
            if (document.scenenote)
                return document.panToNote();

            // Note is not in current scene, we look in all scenes and take first match
            const scene = game.scenes.filter(s => s.notes.filter(x => x.entryId === document.id).length > 0)[0];
            await scene.view();

            // Wait 30s maximum for canvas to be ready before panning to note. Check is done every 0.5 second.
            safeSetInterval(() => canvas.ready, () => entity.panToNote(), 500, 30000);
        }
    });

    // JournalEntry - "Configure Ownership" button
    BetterDocumentLink.registerJournalEntryAction({
        name: "OWNERSHIP.Configure",
        icon: "fa-lock fa-fw",
        condition: () => game.user.isGM || game.user.isTrusted,
        callback: async document => new DocumentOwnershipConfig(document).render(true)
    });
}

function registerJournalEntryPageActions() {
    // JournalEntryPage - "Show players (Text)" button
    BetterDocumentLink.registerJournalEntryPageAction({
        name: `${game.i18n.localize("JOURNAL.ActionShow")} (${game.i18n.localize("JOURNAL.ModeText")})`,
        icon: "fa-eye",
        condition: (uuid, data) => data?.img !== CONST.DEFAULT_TOKEN && (game.user.isGM || game.user.isTrusted),
        callback: async document => await showImage(document.uuid, document.name, "text")
    });

    // JournalEntryPage - "Show players (Image)" button
    BetterDocumentLink.registerJournalEntryPageAction({
        name: `${game.i18n.localize("JOURNAL.ActionShow")} (${game.i18n.localize("JOURNAL.ModeImage")})`,
        icon: "fa-eye",
        condition: (uuid, data) => data?.img !== CONST.DEFAULT_TOKEN && (game.user.isGM || game.user.isTrusted),
        callback: async document => await showImage(document.uuid, document.name, "image")
    });

    // JournalEntryPage - "Configure Ownership" button
    BetterDocumentLink.registerJournalEntryPageAction({
        name: "OWNERSHIP.Configure",
        icon: "fa-lock fa-fw",
        condition: () => game.user.isGM || game.user.isTrusted,
        callback: async document => new DocumentOwnershipConfig(document).render(true)
    });
}

function registerMacroActions() {
    // Macro - "Edit Macro" button
    BetterDocumentLink.registerMacroAction({
        name: "MACRO.Edit",
        icon: "fa-edit",
        condition: (uuid, data) => game.user.isGM || game.user.isTrusted || permissionHelper(data, [CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER]),
        callback: async document => document.sheet.render(true)
    });
}

function registerRollTableActions() {
    // RollTable - "Roll" button
    BetterDocumentLink.registerRolltableAction({
        name: "TABLE.Roll",
        icon: "fa-dice-d20",
        condition: (uuid, data) => (game.user.isGM || game.user.isTrusted) || permissionHelper(data, [CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER]),
        callback: async document => await document.draw()
    });

    // RollTable - "Configure Ownership" button
    BetterDocumentLink.registerRolltableAction({
        name: "OWNERSHIP.Configure",
        icon: "fa-lock fa-fw",
        condition: () => game.user.isGM || game.user.isTrusted,
        callback: async document => new DocumentOwnershipConfig(document).render(true)
    });
}

function registerCardsActions() {
    // Cardstacks - "Shuffle" button
    BetterDocumentLink.registerCardStacksAction({
        name: "CARDS.Shuffle",
        icon: "fa-random",
        condition: (uuid, data) => data?.img !== CONST.DEFAULT_TOKEN && (game.user.isGM || game.user.isTrusted) && data.type.localeCompare("hand", undefined, {sensitivity: "base"}) !== 0,
        callback: async document => await document.shuffle()
    });

    // Cardstacks - "Draw" button
    BetterDocumentLink.registerCardStacksAction({
        name: "CARDS.Draw",
        icon: "fa-edit",
        condition: (uuid, data) => data?.img !== CONST.DEFAULT_TOKEN && (game.user.isGM || game.user.isTrusted) && data.type.localeCompare("hand", undefined, {sensitivity: "base"}) === 0,
        callback: async document => await document.drawDialog()
    });

    // Cardstacks - "Deal" button
    BetterDocumentLink.registerCardStacksAction({
        name: "CARDS.Deal",
        icon: "fa-share-square",
        condition: (uuid, data) => data?.img !== CONST.DEFAULT_TOKEN && (game.user.isGM || game.user.isTrusted) && data.type.localeCompare("deck", undefined, {sensitivity: "base"}) === 0,
        callback: async document => await document.dealDialog()
    });

    // Cardstacks - "Pass" button
    BetterDocumentLink.registerCardStacksAction({
        name: "CARDS.Pass",
        icon: "fa-share-square",
        condition: (uuid, data) => data?.img !== CONST.DEFAULT_TOKEN && (game.user.isGM || game.user.isTrusted) && data.type.localeCompare("deck", undefined, {sensitivity: "base"}) !== 0,
        callback: async document => await document.passDialog()
    });

    // Cardstacks - "Reset" button
    BetterDocumentLink.registerCardStacksAction({
        name: "CARDS.Reset",
        icon: "fa-undo",
        condition: (uuid, data) => data?.img !== CONST.DEFAULT_TOKEN && (game.user.isGM || game.user.isTrusted),
        callback: async document => await document.resetDialog()
    });

    // Cardstacks - "Configure Ownership" button
    BetterDocumentLink.registerCardStacksAction({
        name: "OWNERSHIP.Configure",
        icon: "fa-lock fa-fw",
        condition: () => game.user.isGM || game.user.isTrusted,
        callback: async document => new DocumentOwnershipConfig(document).render(true)
    });
}

function registerPlaylistActions() {

    BetterDocumentLink.registerPlaylistAction({
        name: "PLAYLIST.Edit",
        icon: "fa-edit",
        condition: () => game.user.isGM || game.user.isTrusted,
        callback: async document => await document.sheet.render(true)
    });

    BetterDocumentLink.registerPlaylistAction({
        name: "PLAYLIST.Backward",
        icon: "fa-backward",
        condition: (uuid, data) => (game.user.isGM || game.user.isTrusted) && data.playing,
        callback: async document => await document.playNext(undefined, {direction:-1})
    });

    BetterDocumentLink.registerPlaylistAction({
        name: "PLAYLIST.Forward",
        icon: "fa-forward",
        condition: (uuid, data) => (game.user.isGM || game.user.isTrusted) && data.playing,
        callback: async document => await document.playNext(undefined, {direction:1})
    });
}

function registerPlaylistSoundActions() {

    BetterDocumentLink.registerPlaylistSoundAction({
        name: "PLAYLIST.SoundEdit",
        icon: "fa-edit",
        condition: () => game.user.isGM || game.user.isTrusted,
        callback: async document => await document.sheet.render(true)
    });

    BetterDocumentLink.registerPlaylistSoundAction({
        name: "PLAYLIST.SoundPreload",
        icon: "fa-download",
        condition: (uuid, data) => (game.user.isGM || game.user.isTrusted) && !data.playing,
        callback: async document => await AudioHelper.preloadSound(document)
    });
}

Hooks.on('ready', () => {

    registerActorActions();
    registerItemActions();
    registerSceneActions();
    registerJournalEntryActions();
    registerJournalEntryPageActions();
    registerMacroActions();
    registerRollTableActions();
    registerCardsActions();
    registerPlaylistActions();
    registerPlaylistSoundActions();

    Hooks.on('renderJournalSheet', BetterDocumentLink.enhanceDocumentLinks);
    Hooks.on('renderActorSheet', BetterDocumentLink.enhanceDocumentLinks);
    Hooks.on('renderJournalPageSheet', BetterDocumentLink.enhanceDocumentLinks);
    Hooks.on('renderItemSheet', BetterDocumentLink.enhanceDocumentLinks);
    //Hooks.on('renderChatMessage', BetterEntityLink.enhanceEntityLinks);
})

/*
Hooks.on('renderApplication', enhanceEntityLink);
Hooks.on('renderDocumentSheet', enhanceEntityLink);
Hooks.on('renderRollTableConfig', enhanceEntityLink);
Hooks.on('renderSidebarTab', enhanceEntityLink);
Hooks.on('renderFormApplication', enhanceEntityLink);
*/
